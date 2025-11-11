import React, { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../utils/hooks";
import { fetchInvoice, saveItems, setItems } from "../features/invoices/invoicesSlice";

export default function InvoiceView() {
	const { id } = useParams();
	const dispatch = useAppDispatch();
	const invoice = useAppSelector((s) => s.invoices.current);
	const items = useAppSelector((s) => s.invoices.items);

	useEffect(() => {
		if (id) dispatch(fetchInvoice(Number(id)));
	}, [dispatch, id]);

	function addRow() {
		const today = new Date().toISOString().slice(0, 10);
		dispatch(setItems([...items, { item_date: today, description: "", quantity: 1, amount: 0 }]));
	}
	function update(idx: number, field: "item_date" | "description" | "quantity" | "amount", val: any) {
		const clone = items.map((x) => ({ ...x }));
		// basic numeric coercion
		if (field === "quantity" || field === "amount") val = Number(val);
		(clone[idx] as any)[field] = val;
		dispatch(setItems(clone));
	}
	function remove(idx: number) {
		const clone = items.slice();
		clone.splice(idx, 1);
		dispatch(setItems(clone));
	}
	function save() {
		if (!invoice) return;
		dispatch(saveItems({ id: invoice.id, items }));
	}

	const subtotal = useMemo(() => items.reduce((s, it) => s + Number(it.amount || 0), 0), [items]);
	const tps = useMemo(() => Math.round(subtotal * 0.05 * 100) / 100, [subtotal]); // 5%
	const tvq = useMemo(() => Math.round((subtotal + tps) * 0.09975 * 100) / 100, [subtotal, tps]); // 9.975%
	const total = useMemo(() => Math.round((subtotal + tps + tvq) * 100) / 100, [subtotal, tps, tvq]);

	if (!invoice) return <div style={{ padding: 16 }}>Select an invoice</div>;
	return (
		<div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
			<div style={{ padding: 12, borderBottom: "1px solid #eee", display: "flex", gap: 12, alignItems: "center" }}>
				<h3 style={{ margin: 0, flex: 1 }}>{invoice.name}</h3>
				<button onClick={save}>Save</button>
			</div>
			<div style={{ padding: 12, display: "grid", gap: 12, gridTemplateColumns: "1fr" }}>
				{invoice.audio_url && (
					<audio src={invoice.audio_url} controls style={{ width: "100%" }}>
						Your browser does not support the audio element.
					</audio>
				)}
				<div style={{ overflow: "auto", border: "1px solid #eee" }}>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<thead style={{ position: "sticky", top: 0, background: "#fafafa" }}>
							<tr>
								<th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Date</th>
								<th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Description</th>
								<th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>Qty</th>
								<th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>Amount</th>
								<th style={{ width: 1 }} />
							</tr>
						</thead>
						<tbody>
							{items.map((it, idx) => (
								<tr key={idx}>
									<td style={{ padding: 6, borderBottom: "1px solid #f5f5f5" }}>
										<input
											type="date"
											value={it.item_date}
											onChange={(e) => update(idx, "item_date", e.target.value)}
										/>
									</td>
									<td style={{ padding: 6, borderBottom: "1px solid #f5f5f5" }}>
										<input
											style={{ width: "100%" }}
											value={it.description}
											onChange={(e) => update(idx, "description", e.target.value)}
										/>
									</td>
									<td style={{ padding: 6, textAlign: "right", borderBottom: "1px solid #f5f5f5" }}>
										<input
											type="number"
											min={0}
											step="0.01"
											value={it.quantity}
											onChange={(e) => update(idx, "quantity", e.target.value)}
											style={{ width: 100, textAlign: "right" }}
										/>
									</td>
									<td style={{ padding: 6, textAlign: "right", borderBottom: "1px solid #f5f5f5" }}>
										<input
											type="number"
											min={0}
											step="0.01"
											value={it.amount}
											onChange={(e) => update(idx, "amount", e.target.value)}
											style={{ width: 140, textAlign: "right" }}
										/>
									</td>
									<td style={{ padding: 6 }}>
										<button onClick={() => remove(idx)}>Delete</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
					<div style={{ padding: 8 }}>
						<button onClick={addRow}>Add row</button>
					</div>
				</div>
			</div>
			<div
				style={{
					marginTop: "auto",
					borderTop: "1px solid #eee",
					padding: 12,
					display: "grid",
					gap: 4,
					justifyContent: "end"
				}}
			>
				<div>Subtotal: ${subtotal.toFixed(2)}</div>
				<div>TPS (5%): ${tps.toFixed(2)}</div>
				<div>TVQ (9.975%): ${tvq.toFixed(2)}</div>
				<div style={{ fontWeight: 700 }}>Total: ${total.toFixed(2)}</div>
			</div>
		</div>
	);
}


