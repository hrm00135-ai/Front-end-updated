import { useState } from "react";
import Layout from "../../components/Layout";
import TaskCard from "../../components/TaskCard";
import TaskColumn from "../../components/TaskColumn";
import { Plus } from "lucide-react";

const AssignTask = () => {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    id: "",
    title: "",
    time: "",
    employee: "",
    image: null, // ✅ NEW
  });

  // Add Task
  const handleAddTask = () => {
    if (!formData.id || !formData.title) return;

    const newTask = {
      ...formData,
      status: "new",
      uid: Date.now(),
    };

    setTasks([...tasks, newTask]);

    setFormData({
      id: "",
      title: "",
      time: "",
      employee: "",
      image: null,
    });

    setShowForm(false);
  };

  // Delete Task
  const deleteTask = (uid) => {
    setTasks(tasks.filter((task) => task.uid !== uid));
  };

  // Move Task
  const moveTask = (uid, direction) => {
    setTasks(
      tasks.map((task) => {
        if (task.uid !== uid) return task;

        if (direction === "forward") {
          if (task.status === "new") return { ...task, status: "progress" };
          if (task.status === "progress") return { ...task, status: "completed" };
        }

        if (direction === "back") {
          if (task.status === "completed") return { ...task, status: "progress" };
          if (task.status === "progress") return { ...task, status: "new" };
        }

        return task;
      })
    );
  };

  return (
    <Layout>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Assign Tasks</h1>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg"
        >
          <Plus size={18} />
          Add Task
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white p-4 rounded-xl shadow mb-6 space-y-3">

          <input
            type="text"
            placeholder="Task ID"
            value={formData.id}
            onChange={(e) =>
              setFormData({ ...formData, id: e.target.value })
            }
            className="w-full border p-2 rounded"
          />

          <input
            type="text"
            placeholder="Task Name"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full border p-2 rounded"
          />

          <input
            type="text"
            placeholder="Time (e.g. 12:00)"
            value={formData.time}
            onChange={(e) =>
              setFormData({ ...formData, time: e.target.value })
            }
            className="w-full border p-2 rounded"
          />

          <input
            type="text"
            placeholder="Employee Name"
            value={formData.employee}
            onChange={(e) =>
              setFormData({ ...formData, employee: e.target.value })
            }
            className="w-full border p-2 rounded"
          />

          {/* ✅ NEW: Image Upload */}
          <input
            type="file"
            onChange={(e) =>
              setFormData({ ...formData, image: e.target.files[0] })
            }
            className="w-full"
          />

          <button
            onClick={handleAddTask}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Create Task
          </button>
        </div>
      )}

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        {/* New Tasks */}
        <TaskColumn title="New Tasks">
          {tasks
            .filter((task) => task.status === "new")
            .map((task) => (
              <TaskCard
                key={task.uid}
                {...task}
                onDelete={() => deleteTask(task.uid)}
                onMove={(dir) => moveTask(task.uid, dir)}
              />
            ))}
        </TaskColumn>

        {/* In Progress */}
        <TaskColumn title="In Progress">
          {tasks
            .filter((task) => task.status === "progress")
            .map((task) => (
              <TaskCard
                key={task.uid}
                {...task}
                onDelete={() => deleteTask(task.uid)}
                onMove={(dir) => moveTask(task.uid, dir)}
              />
            ))}
        </TaskColumn>

        {/* Review */}
        <TaskColumn title="Review" />

        {/* Completed */}
        <TaskColumn title="Completed">
          {tasks
            .filter((task) => task.status === "completed")
            .map((task) => (
              <TaskCard
                key={task.uid}
                {...task}
                onDelete={() => deleteTask(task.uid)}
                onMove={(dir) => moveTask(task.uid, dir)}
              />
            ))}
        </TaskColumn>

      </div>

    </Layout>
  );
};

export default AssignTask;