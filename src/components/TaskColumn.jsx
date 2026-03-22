import { Plus } from "lucide-react";

const TaskColumn = ({ title, children }) => {
  return (
    <div className="bg-gray-100 p-4 rounded-xl min-h-[500px]">

      {/* Header */}
      <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow mb-4">
        <h2 className="font-semibold">{title}</h2>

        <button className="bg-slate-900 text-white p-1 rounded hover:bg-slate-800">
          <Plus size={16} />
        </button>
      </div>

      {/* Tasks */}
      {children}

    </div>
  );
};

export default TaskColumn;