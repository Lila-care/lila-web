import { UserReport } from "./UsersTable"
import { UsersTable } from "./UsersTable"

const mockData: UserReport[] = [
  {
    id: "1",
    name: "Ana Lopez",
    email: "ana@example.com",
    cycleReports: 3,
    energyReports: 10,
    symptomsReports: 5,
    total: 18,
  },
  {
    id: "2",
    name: "María Perez",
    email: "maria@example.com",
    cycleReports: 1,
    energyReports: 2,
    symptomsReports: 1,
    total: 4,
  },
]

function Admin() {
  return (
    <div className="p-10">
      <h1 className="text-2xl font-semibold mb-6">Users Activity</h1>
      <UsersTable data={mockData} />
    </div>
  )
}

export default Admin