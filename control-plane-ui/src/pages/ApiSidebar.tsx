// control-plane/src/components/ApiSidebar.tsx
type Api = {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  openapiSpec?: any;
};

type Props = {
  apis: Api[];
  selectedApi: Api | null;
  onSelect: (api: Api) => void;
  loading: boolean;
};

export function ApiSidebar({ apis, selectedApi, onSelect, loading }: Props) {
  return (
    <div className="w-64 bg-white shadow-md p-4">
      <h2 className="text-xl font-bold mb-4">APIs</h2>
      {loading ? (
        <p>Carregando APIs...</p>
      ) : (
        apis.map(api => (
          <div
            key={api.id}
            className={`p-3 mb-2 rounded cursor-pointer border ${selectedApi?.id === api.id ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
            onClick={() => onSelect(api)}
          >
            <h3 className="font-semibold">{api.name}</h3>
            <p className="text-sm text-gray-500">{api.baseUrl}</p>
            {api.openapiSpec && <p className="text-xs text-gray-400 mt-1">{Object.keys(api.openapiSpec.paths || {}).length} endpoints</p>}
          </div>
        ))
      )}
    </div>
  );
}