export default function StudentForm() {
    return(
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-bg)]">
            <header className="h-20 w-full flex items-center justify-between px-8 shadow-md mb-6 bg-[var(--color-primary)]">
                <nav className="bg-white p-4 rounded shadow-md w-full max-w-md mb-6">
                    <ul className="flex flex-col gap-2">
                        <li></li>
                        <li></li>
                        <li></li>
                    </ul>
                </nav>
            </header>
            <main className="flex flex-col items-center justify-center w-full px-4 bg-[var(--color-bg)] text-[var(--color-text)]">
                <h1 className="text-3xl font-bold mb-6">Enter your student details</h1>
                <form className="bg-white p-6 rounded shadow-md w-full max-w-md">
                    <div className="flex flex-col gap-4">
                        <input type="text" placeholder="Name" className="p-2 rounded border border-gray-300" />
                        <input type="text" placeholder="Department" className="p-2 rounded border border-gray-300" />
                        <input type="text" placeholder="Course/Programme" className="p-2 rounded border border-gray-300" />
                        <input type="email" placeholder="Email" className="p-2 rounded border border-gray-300" />
                        <button className="bg-[var(--color-primary)] text-white p-2 rounded">Generate Letter</button>
                    </div>
                </form>
            </main>
        </div>
    )
}