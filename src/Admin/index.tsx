import { useEffect, useState } from "react"
import { fetchUsers } from "@/api/users"
import { UserReport, UsersTable } from "./UsersTable"

function Admin() {
  const [data, setData] = useState<UserReport[]>([])
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    fetchUsers(page, limit)
      .then((res) => {
        setData(res.data)
        setTotalPages(res.totalPages)
      })
      .finally(() => setLoading(false))
  }, [page, limit])

  return (
    <div className="p-10">
      <h1 className="text-2xl font-semibold mb-6">Users Activity</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          <UsersTable data={data} />

          <div className="flex items-center gap-4 mt-6">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-40"
            >
              Prev
            </button>

            <span>Page {page} of {totalPages}</span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default Admin
