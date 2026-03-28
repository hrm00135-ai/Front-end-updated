import { useEffect, useState } from "react";
import { apiCall } from "../../utils/api";

const EmployeeTasks = () => {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const res = await apiCall("/tasks/my-tasks");
    const data = await res.json();
    if (data.status === "success") {
      setTasks(data.data);
    }
  };

  const updateStatus = async (id, status) => {
    await apiCall(`/tasks/${id}/update`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    fetchTasks();
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">My Tasks</h1>

      {tasks.map(task => (
        <div key={task.id} className="border rounded p-3 mb-3">
          <h3 className="font-semibold">{task.title}</h3>
          <p>{task.description}</p>
          <p>Priority: {task.priority}</p>
          <p>Status: {task.status}</p>
          <p>Due Date: {task.due_date}</p>

          <select
            value={task.status}
            onChange={(e) => updateStatus(task.id, e.target.value)}
            className="border px-2 py-1 mt-2"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>
      ))}
    </div>
  );
};

export default EmployeeTasks;