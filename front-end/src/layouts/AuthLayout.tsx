import { Outlet } from "react-router-dom";
import { NavbarComponent } from "../components/Navbar/Navbar";
import s from "./AuthLayout.module.css";

export function AuthLayout(){
    return(
        <div className={s.shell}>
            <NavbarComponent showUserAvatar />
            <main className={s.main}>
                <Outlet/>
            </main>
        </div>
    )
}
