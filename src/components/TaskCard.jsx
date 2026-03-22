import { Trash2, ArrowRight, ArrowLeft } from "lucide-react";

const TaskCard = ({
  id,
  title,
  time,
  employee,
  status,
  image,        // ✅ NEW
  onDelete,
  onMove,
}) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow mb-3">

      <h3 className="font-semibold text-gray-800">
        {id} - {title}
      </h3>

      <p className="text-sm text-gray-500 mb-2">
        {employee}
      </p>

      {/* ✅ Image Preview */}
      {image && (
        <img
          src={URL.createObjectURL(image)}
          alt="task"
          className="w-full h-32 object-cover rounded mb-2"
        />
      )}

      <div className="flex items-center justify-between mt-2">

        <div className="text-sm text-green-600 border border-green-400 px-2 py-0.5 rounded">
          {time}
        </div>

        <div className="flex items-center gap-2">

          {/* Back */}
          {status !== "new" && (
            <button onClick={() => onMove("back")}>
              <ArrowLeft size={16} />
            </button>
          )}

          {/* Forward */}
          {status !== "completed" && (
            <button onClick={() => onMove("forward")}>
              <ArrowRight size={16} />
            </button>
          )}

          {/* Delete */}
          <button onClick={onDelete}>
            <Trash2 size={16} className="text-red-500" />
          </button>

        </div>

      </div>

    </div>
  );
};

export default TaskCard;