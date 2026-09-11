export default function NoDocumentAccess() {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-center">
      <div>
        <h1 className="mb-2 text-lg font-medium text-gray-800">You don&apos;t have access to this document</h1>
        <p className="text-sm text-gray-500">
          Only users assigned to this document&apos;s ordered service can open it.
        </p>
      </div>
    </div>
  );
}
