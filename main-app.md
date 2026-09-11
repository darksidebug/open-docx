`.env`

```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/v1

```

`Dockerfile`
```
# =============================
# 1. Base Stage (common setup)
# =============================
FROM node:22.14-alpine AS base
WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy everything
COPY . .

# =============================
# 2. Development Stage
# =============================
FROM base AS dev

# Enable hot reload
CMD ["npm", "run", "dev"]

# =============================
# 3. Build Stage
# =============================
FROM base AS build
COPY .env.example .env
RUN npm run build

# =============================
# 4. Production Stage
# =============================
FROM node:22.14-alpine AS prod
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S kreditinfo -u 1001 -G nodejs

# Copy only what’s needed for prod
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts

# Remove dev dependencies
RUN npm prune --omit=dev

RUN chown -R kreditinfo:nodejs /app

USER kreditinfo

EXPOSE 3000
CMD ["npm", "start"]

```

`docker-compose.yml`
```
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
      target: dev
    container_name: kreditinfo_client
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      - CHOKIDAR_USEPOLLING=true
      - WATCHPACK_POLLING=true
      - NEXT_WEBPACK_USEPOLLING=1
      - CHOKIDAR_INTERVAL=200
      - NODE_ENV=development
    command: npm run dev

```

`./utils/axios.ts`
```
import axios from "axios";

export const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export default axios.create({
  baseURL: BASE_URL
});

export const privateAxios = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

```

`./utils/endpoints.ts`
```
export const USER_LOGIN = '/auth/login';

```

`./hooks/axios/useAxiosInterceptor.ts`
```
import { useContext, useEffect } from 'react';
import { useRefreshToken } from '../useRefreshToken'
import { privateAxios } from '@/utils/axios';
import { AuthContext } from '@/context/provider/auth/AuthContext';

export const useAxiosInterceptor = () => {
  const { refreshToken } = useRefreshToken();
  const { user, setUser } = useContext(AuthContext);

  useEffect(() => {
    const storageUser = JSON.parse(localStorage.getItem('user') as string);
    setUser(storageUser)

    const requestInterceptor = privateAxios.interceptors.request.use(
      config => {
        if (!config?.headers['Authorization']) {
          config.headers['Authorization'] = `Bearer ${ user?.device_hash_id || storageUser?.device_hash_id }`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    const interceptor = privateAxios.interceptors.response.use(
      response => response,
      async (error) => {
        const prevRequest = error?.config;

        if (error?.response?.status === 403 && !prevRequest?.sent) {
          prevRequest.sent = true;

          const newAccessToken = await refreshToken();
          prevRequest.headers['Authorization'] = `Bearer ${ newAccessToken }`;

          return privateAxios(prevRequest)
        }

        return Promise.reject(error);
      }
    )

    setUser(user);

    return () => {
      privateAxios.interceptors.response.eject(requestInterceptor);
      privateAxios.interceptors.response.eject(interceptor);
    }
  }, [user, refreshToken]);

  return { privateAxios }
};

```

`./hooks/auth/useAuth.ts`
```
const AUTH_BASE = `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth`;

const handleAuthSignIn = async (e: FormEvent<HTMLFormElement>) => {
  try {
    setIsSending(true);

    e.preventDefault();
    if (handleValidateOnSubmit(e)) {
      setIsSending(false);
      return;
    }

    const { data } = await axios.post(`${AUTH_BASE}/login`, form);

    if (data?.status === 'success') {
      const {
        user,
        authorization,
        is_otp_required,
        is_account_setup_required,
      } = data;
      const userInfo = {
        ...user,
        is_otp_required,
        client_type: user?.user_client?.client?.type,
        is_account_setup_required,
        device_hash_id: authorization.token,
        interceptor: true,
        monitor_usage: true,
        browser_inspect: true,
        client: user?.user_client?.client
      }

      setUser(userInfo);
      localStorage.setItem('user', JSON.stringify({...userInfo, is_account_updated: true }));
      setIsSending(false);

      if (is_account_setup_required) {
        setIsAccountVerificationRequired(true);
        return;
      }

      setIsAccountVerificationRequired(false);

      if (is_otp_required) {
        return router.push('/auth/user/two-factor-authentication');
      }

      if ([1, 4]?.includes(user?.role_id)) {
        return router.push('/admin/dashboard');
      }

      if ([5, 6]?.includes(user?.role_id)) {
        return router.push('/admin/dashboard/assignments');
      }

      return router.push('/dashboard');
    }
  } catch (error: unknown) {
    setIsSending(false)

    if (axios.isAxiosError(error) && error.response) {
      const { data, status } = error.response;

      if (status === 401) {
        data.error = 'Invalid username or password.';
      } else {
        data.error = data.error
      }

      setFormError(data.error || 'An error occured while trying to sign-in.');
    }
  }
}

```

## sample fetch of users
`./hooks/users/useUsers.ts`
```
const fetchSiteUsers = useCallback(async () => {
  try {
    let dateFilter = '', searchFilter = '', sort = '', statusFilter = '';

    if (startDate && endDate) {
      dateFilter = `&start_date=${startDate}&end_date=${endDate}`
    }

    if (filter) {
      searchFilter = `&filter=${filter}`
    }

    if (currentSort) {
      sort = `&sort=${currentSort}`;
    }

    if (status) {
      const statusList = String(status)?.includes(',') ? String(status)?.split(',') : [status];
      statusList?.map(item => {
        statusFilter += `&role_ids[]=${item}`
      });
    }

    const { data } = await privateAxios(
      `/admin/users?per_page=${perPage}&page=${currentPage}${sort}${dateFilter}${searchFilter}${statusFilter}`
    )

    if (data?.status === 200) {
      const lists = data?.data?.filter((item: any) => {
        if (!item?.email?.includes('josefmunasque@gmail.com') && !item?.email?.includes('nobeginmasob@gmail.com')) {
          return {
            id: item.id,
            last_name: item?.last_name,
            first_name: item?.first_name,
            middle_name: item?.middle_name || '',
            suffix: item?.suffix || '',
            email: item?.email,
            role_id: item?.role_id,
            role_type: (() => {
              const { role } = roles?.filter(({id}: { id: number }) => id === item?.role_id)[0] || { role: ''} as { role: string };
              return role || 'N/A';
            })()
          }
        }
      });
      setDataLists(lists);
      setTotalPage(data?.meta?.total || 0);
      setLoading(false)
    }
  } catch (error: any) {
    setLoading(false);

    if (error.code === 'ERR_NETWORK') {
      return handleResponseError({ isNetworkError: true });
    }

    if (error.response) {
      const {data} = error.response;

      if(data.message === "Unauthenticated.") {
        handleResponseError({ isAuthError: true });
      } else {
        handleResponseError({ message: 'There was an error while performing filter on query. Please try again later!' });
      }
      return;
    }

    handleResponseError({ message: 'There was an error fetching site users. <br /> Please try again later!'});
  }
}, [
  currentPage,
  startDate,
  endDate,
  filter,
  perPage,
  currentSort,
  roles,
  status
]);

```

