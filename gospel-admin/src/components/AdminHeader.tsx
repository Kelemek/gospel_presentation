'use client'

interface AdminHeaderProps {
  title: string
  description: string
  actions?: React.ReactNode
}

export default function AdminHeader({ title, description, actions }: AdminHeaderProps) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-100 p-4 sm:p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-br from-slate-700 to-slate-800 bg-clip-text text-transparent mb-2">
            {title}
          </h1>
          <p className="text-slate-600 text-base sm:text-lg">{description}</p>
        </div>

        {actions && (
          <div className="flex flex-row items-center gap-2 w-full lg:w-auto lg:ml-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
