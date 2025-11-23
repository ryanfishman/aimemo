import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { store } from "./app/store";
import Login from "./routes/Login";
import AppShell from "./routes/AppShell";
import InvoiceView from "./routes/InvoiceView";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

const router = createBrowserRouter([
	{ path: "/", element: <Login /> },
	{
		path: "/app",
		element: <AppShell />,
		children: [{ path: "invoice/:id", element: <InvoiceView /> }]
	}
]);

const theme = createTheme({
	palette: { mode: "light", primary: { main: "#1976d2" } }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<Provider store={store}>
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<RouterProvider router={router} />
			</ThemeProvider>
		</Provider>
	</React.StrictMode>
);


