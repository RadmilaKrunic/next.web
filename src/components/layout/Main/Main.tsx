import "./Main.scss";
import AppRoutes from "../../../routes/Routes";
import Breadcrumbs from "../Breadcrumbs/Breadcrumbs";
import MessagesList from "../../ui/MessagesList/MessagesList";

function Main() {
  return (
    <main className="bass-next-main">
      <Breadcrumbs />
      <MessagesList />
      <div className="content">
        <AppRoutes />
      </div>
    </main>
  );
}

export default Main;
