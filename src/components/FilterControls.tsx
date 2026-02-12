"use client";

interface FilterControlsProps {
  radius: number;
  onRadiusChange: (radius: number) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  gliderCategory: string;
  onGliderCategoryChange: (cat: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onSearch: () => void;
}

export default function FilterControls({
  radius,
  onRadiusChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  gliderCategory,
  onGliderCategoryChange,
  searchQuery,
  onSearchQueryChange,
  onSearch,
}: FilterControlsProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Search:</label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          placeholder="lat,lng or site name"
          className="border rounded px-2 py-1 text-sm w-48"
        />
        <button
          onClick={onSearch}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
        >
          Go
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Radius:</label>
        <select
          value={radius}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
          className="border rounded px-2 py-1 text-sm"
        >
          {[5, 10, 20, 30, 50].map((r) => (
            <option key={r} value={r}>
              {r} km
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">From:</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">To:</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Glider:</label>
        <select
          value={gliderCategory}
          onChange={(e) => onGliderCategoryChange(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </div>
    </div>
  );
}
