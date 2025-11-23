import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../utils/hooks";
import { logout, refresh } from "../features/auth/authSlice";
import { fetchInvoices } from "../features/invoices/invoicesSlice";
import {
	AppBar,
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
	List,
	ListItem,
	ListItemButton,
	ListItemSecondaryAction,
	ListItemText,
	Paper,
	TextField,
	Toolbar,
	Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

export default function AppShell() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const auth = useAppSelector((s) => s.auth);
	const invoices = useAppSelector((s) => s.invoices.list);
	const [search, setSearch] = useState("");
	const [showDialog, setShowDialog] = useState(false);
	const [newName, setNewName] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [confirmId, setConfirmId] = useState<number | null>(null);
	const location = useLocation();
	const selectedId = Number(location.pathname.split("/").pop());

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
		const fd = new FormData();
		fd.append("name", newName);
		fd.append("file", file);
		const res = await fetch("/api/invoices/create_ai_invoice", {
			method: "POST",
			headers: { Authorization: `Bearer ${auth.accessToken || ""}` },
			credentials: "include",
			body: fd
		}).then((r) => r.json());
		// Refresh list immediately so the new invoice appears
		dispatch(fetchInvoices(""));
		setShowDialog(false);
		setFile(null);
		setNewName("");
		navigate(`/app/invoice/${res.id}`);
	}

	async function onDelete(id: number) {
		await fetch(`/api/invoices/${id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${auth.accessToken || ""}` },
			credentials: "include"
		});
		setConfirmId(null);
		dispatch(fetchInvoices(""));
		if (selectedId === id) navigate("/app");
	}

	return (
		<Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
			<AppBar position="static" color="default" elevation={1}>
				<Toolbar>
					<Typography variant="h6" sx={{ flex: 1 }}>
						AI-Invoice
					</Typography>
					<Button color="inherit" onClick={onLogout}>
						Logout
					</Button>
				</Toolbar>
			</AppBar>
			<Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
				<Paper
					variant="outlined"
					sx={{ width: 320, borderRadius: 0, borderLeft: 0, borderTop: 0, borderBottom: 0, p: 1 }}
				>
					<Box sx={{ display: "flex", gap: 1, p: 1 }}>
						<TextField
							size="small"
							placeholder="Search by name"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							fullWidth
						/>
						<IconButton color="primary" onClick={() => setShowDialog(true)}>
							<AddIcon />
						</IconButton>
					</Box>
					<List dense sx={{ overflow: "auto", height: "calc(100% - 64px)" }}>
						{filtered.map((i) => (
							<ListItem key={i.id} disablePadding secondaryAction={
								<IconButton edge="end" aria-label="delete" onClick={() => setConfirmId(i.id)}>
									<DeleteIcon />
								</IconButton>
							}>
								<ListItemButton selected={i.id === selectedId} onClick={() => navigate(`/app/invoice/${i.id}`)}>
									<ListItemText
										primary={i.name}
										secondary={new Date(i.created_at).toLocaleDateString()}
									/>
								</ListItemButton>
							</ListItem>
						))}
					</List>
				</Paper>
				<Box sx={{ flex: 1, minWidth: 0 }}>
					<Outlet />
				</Box>
			</Box>

			<Dialog open={showDialog} onClose={() => setShowDialog(false)}>
				<DialogTitle>New Invoice</DialogTitle>
				<DialogContent sx={{ display: "grid", gap: 2, pt: 2, width: 420 }}>
					<TextField label="Invoice name" value={newName} onChange={(e) => setNewName(e.target.value)} />
					<Button variant="outlined" component="label">
						Choose audio file
						<input type="file" accept="audio/*" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
					</Button>
					<Typography variant="body2" color="text.secondary">
						{file?.name || "No file selected"}
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setShowDialog(false)}>Cancel</Button>
					<Button onClick={createNewInvoice} disabled={!newName || !file} variant="contained">
						Create
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={confirmId !== null} onClose={() => setConfirmId(null)}>
				<DialogTitle>Delete invoice?</DialogTitle>
				<DialogContent>
					<Typography variant="body2">This will remove the invoice and its audio file. This action cannot be undone.</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmId(null)}>Cancel</Button>
					<Button color="error" variant="contained" onClick={() => confirmId && onDelete(confirmId)}>
						Delete
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}


