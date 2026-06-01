import './Navbar.css'

export default function Navbar() {
    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <img
                    src="/logo.png"
                    alt="Unwrite logo"
                    className="navbar-logo"
                    width={18}
                    height={18}
                />
                <span className="navbar-text">UNWRITE</span>
            </div>
        </nav>
    )
}