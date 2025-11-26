import { useEffect, useState } from "react"
import { fetchUsers } from "@/api/users"
import { UserReport, UsersTable } from "./UsersTable"
import UserDetails from "./UserDetails"

function Admin() {
  const [data, setData] = useState<UserReport[]>([])
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

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
    <div className="flex">
      {/* LEFT SIDE - Table + Pagination */}
      <div className="flex-1 p-10">
        <h1 className="text-2xl font-semibold mb-6">Users Activity</h1>

        {loading ? (
          <p className="text-lila-text">Loading...</p>
        ) : (
          <>
            <UsersTable data={data} onSelectUser={setSelectedUser} />

            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 bg-lila-primary text-white rounded disabled:opacity-40"
              >
                Prev
              </button>

              <span className="text-lila-text">
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 bg-lila-primary text-white rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {/* RIGHT SIDE - User Details */}
      {selectedUser && (
        <div className="w-[380px] border-l bg-white">
          <UserDetails userId={selectedUser} />
        </div>
      )}
    </div>
  )
}

export default Admin
