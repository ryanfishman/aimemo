import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { store } from "./app/store";
import Login from "./routes/Login";
import AppShell from "./routes/AppShell";
import InvoiceView from "./routes/InvoiceView";

const router = createBrowserRouter([
	{ path: "/", element: <Login /> },
	{
		path: "/app",
		element: <AppShell />,
		children: [{ path: "invoice/:id", element: <InvoiceView /> }]
	}
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<Provider store={store}>
			<RouterProvider router={router} />
		</Provider>
	</React.StrictMode>
);


