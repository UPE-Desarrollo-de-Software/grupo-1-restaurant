import { Outlet } from "react-router-dom";
import { NavbarComponent } from "../components/Navbar/Navbar";
import { BottomNavbar } from "../components/BottomNavbar/BottomNavbar";
import { SubNavbar } from "../components/SubNavbar/SubNavbar";

export function MainLayout(){
    return(
        <>
            <NavbarComponent/>
            <SubNavbar/>
                <main style={{ paddingBottom: 'calc(var(--bottom-nav-height) + var(--space-md))' }}>
                    <Outlet/>
                </main>
            <BottomNavbar/>
        </>
    )
}
