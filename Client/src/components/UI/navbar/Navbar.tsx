import './Navbar.css'


function Navbar() {

    return (
        <div className="navbar">
            <div className="navbar-logo">
                <h1>ITelecNEWS</h1>
            </div>
            <div className="navbar-links">
                <a href="/">Home</a>
                <a href="/second">Second</a>
            </div>
        </div>
    )

}


export default Navbar