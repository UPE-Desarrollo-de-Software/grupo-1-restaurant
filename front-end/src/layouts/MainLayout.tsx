import { Outlet } from "react-router-dom";
import { NavbarComponent } from "../components/Navbar/Navbar";
import { BottomNavbar } from "../components/BottomNavbar/BottomNavbar";

export function MainLayout(){
    return(
        <>
            <NavbarComponent/>
                <main style={{ paddingBottom: 'calc(var(--bottom-nav-height) + var(--space-md))' }}>
                    <Outlet/>
                </main>
            <BottomNavbar/>
        </>
    )
}