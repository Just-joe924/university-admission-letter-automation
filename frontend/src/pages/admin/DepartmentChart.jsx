import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function DepartmentChart({ data = [] }) {
  const chartData = data.map((item) => ({
    department: item.department_name || item.department || item.name,
    students: item.student_count || item.studentCount || item.count || 0,
  }));

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8 h-[430px]">
      <h2 className="text-2xl font-bold text-primary mb-8">
        Students by Department
      </h2>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="department"
            angle={-45}
            textAnchor="end"
            height={90}
            tick={{ fontSize: 14 }}
          />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="students" fill="#0B1F51" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}