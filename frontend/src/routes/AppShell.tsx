import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../utils/hooks";
import { logout, refresh } from "../features/auth/authSlice";
import { createInvoice, fetchInvoices } from "../features/invoices/invoicesSlice";

export default function AppShell() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const auth = useAppSelector((s) => s.auth);
	const invoices = useAppSelector((s) => s.invoices.list);
	const [search, setSearch] = useState("");
	const [showDialog, setShowDialog] = useState(false);
	const [newName, setNewName] = useState("");
	const [file, setFile] = useState<File | null>(null);

	useEffect(() => {
		dispatch(refresh()).unwrap().catch(() => navigate("/"));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (auth.accessToken) dispatch(fetchInvoices(""));
	}, [auth.accessToken, dispatch]);

	async function onLogout() {
		await dispatch(logout());
		navigate("/");
	}

	const filtered = useMemo(() => {
		if (!search) return invoices;
		return invoices.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
	}, [invoices, search]);

	async function createNewInvoice() {
		if (!file || !newName) return;
		// Request presign
		const presign = await fetch("/api/uploads/presign", {
			method: "POST",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.accessToken}` },
			credentials: "include",
			body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream" })
		}).then((r) => r.json());
		// Upload direct to Spaces
		await fetch(presign.url, {
			method: "PUT",
			headers: { "Content-Type": file.type || "application/octet-stream" },
			body: file
		});
		// Create invoice
		const res = await dispatch(createInvoice({ name: newName, objectKey: presign.objectKey })).unwrap();
		setShowDialog(false);
		setFile(null);
		setNewName("");
		navigate(`/app/invoice/${res.id}`);
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
			<header
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "8px 16px",
					borderBottom: "1px solid #ddd"
				}}
			>
				<h3 style={{ margin: 0 }}>AI-Invoice</h3>
				<button onClick={onLogout}>Logout</button>
			</header>
			<div style={{ display: "flex", flex: 1, minHeight: 0 }}>
				<aside
					style={{
						width: 300,
						borderRight: "1px solid #eee",
						padding: 12,
						display: "flex",
						flexDirection: "column",
						gap: 8
					}}
				>
					<div style={{ display: "flex", gap: 8 }}>
						<input
							placeholder="Search by name"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							style={{ flex: 1 }}
						/>
						<button onClick={() => setShowDialog(true)}>+</button>
					</div>
					<div style={{ overflow: "auto" }}>
						{filtered.map((i) => (
							<div
								key={i.id}
								onClick={() => navigate(`/app/invoice/${i.id}`)}
								style={{ padding: "8px 4px", borderBottom: "1px solid #f2f2f2", cursor: "pointer" }}
							>
								<div style={{ fontWeight: 600 }}>{i.name}</div>
								<div style={{ fontSize: 12, color: "#666" }}>{new Date(i.created_at).toLocaleDateString()}</div>
							</div>
						))}
					</div>
				</aside>
				<main style={{ flex: 1, minWidth: 0 }}>
					<Outlet />
				</main>
			</div>

			{showDialog && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0,0,0,0.3)",
						display: "grid",
						placeItems: "center"
					}}
				>
					<div style={{ background: "#fff", padding: 20, borderRadius: 8, width: 420, display: "grid", gap: 8 }}>
						<h3 style={{ margin: 0 }}>New Invoice</h3>
						<input placeholder="Invoice name" value={newName} onChange={(e) => setNewName(e.target.value)} />
						<input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
						<div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
							<button onClick={() => setShowDialog(false)}>Cancel</button>
							<button onClick={createNewInvoice} disabled={!newName || !file}>
								Create
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}


