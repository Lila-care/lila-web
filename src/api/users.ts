import { UserReport } from "@/Admin/UsersTable"

export type PaginatedUsersResponse = {
  data: UserReport[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function fetchUsers(page: number, limit: number): Promise<PaginatedUsersResponse> {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/admin/dashboard/paginated?page=${page}&limit=${limit}`
  )

  if (!res.ok) {
    throw new Error("Error fetching users")
  }

  const json = await res.json()

  // 🟣 Convertir el formato del backend → formato UserReport del frontend
  const mappedData: UserReport[] = json.data.map((item: any) => ({
    id: item.user_id,
    name: item.user_name,
    email: item.user_email,
    cycleReports: item.cycle_reports,
    energyReports: item.energy_reports,
    symptomsReports: item.symptoms_reports,
    total: item.total_reports,
  }))

  return {
    data: mappedData,
    total: json.total,
    page: json.page,
    limit: json.limit,
    totalPages: json.totalPages,
  }
}
