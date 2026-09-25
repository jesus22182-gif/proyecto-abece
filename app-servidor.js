"use strict";

require("dotenv").config({
    path: require("path").join(__dirname, ".env")
});

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const pedidosPendientes = new Map();
const pagosProcesados = new Set();
const pagosEnProceso = new Set();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

function variableObligatoria(nombre) {
    const valor = process.env[nombre];

    if (!valor) {
        throw new Error(`Falta la variable de entorno: ${nombre}`);
    }

    return valor;
}

function escaparHTML(valor = "") {
    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function numeroValido(valor, nombre) {
    const numero = Number(valor);

    if (!Number.isFinite(numero) || numero <= 0) {
        throw new Error(`${nombre} no es válido.`);
    }

    return numero;
}

function dinero(valor) {
    return Number(valor || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN"
    });
}

function obtenerColor(item, colorGeneral) {
    if (item.color) {
        return item.color;
    }

    if (colorGeneral) {
        return colorGeneral;
    }

    const coincidencia = String(item.nombre || "").match(/\(([^()]*)\)\s*$/);

    return coincidencia ? coincidencia[1] : "No especificado";
}

function normalizarPedido(body) {
    const clienteOriginal = body.cliente || body.customerInfo || {};

    const nombreCliente =
        body.nombre ||
        clienteOriginal.nombre ||
        "Cliente no especificado";

    const correoCliente =
        body.correo ||
        clienteOriginal.correo ||
        clienteOriginal.email ||
        "";

    const telefonoCliente =
        body.telefono ||
        clienteOriginal.telefono ||
        "";

    let items;

    if (Array.isArray(body.items) && body.items.length > 0) {
        items = body.items.map((item) => ({
            nombre: String(item.nombre || item.title || "Producto"),
            precio: numeroValido(
                item.precio ?? item.price ?? item.unit_price,
                "precio"
            ),
            cantidad: Math.max(
                1,
                Math.trunc(
                    numeroValido(
                        item.cantidad ?? item.quantity,
                        "cantidad"
                    )
                )
            ),
            color: item.color || body.color || "No especificado"
        }));
    } else {
        items = [{
            nombre: String(body.nombre || "Producto"),
            precio: numeroValido(body.precio, "precio"),
            cantidad: Math.max(
                1,
                Math.trunc(numeroValido(body.cantidad || 1, "cantidad"))
            ),
            color: body.color || "No especificado"
        }];
    }

    const envioOriginal = body.envio || {};

    const direccion =
        body.direccion ||
        envioOriginal.direccionCompleta ||
        [
            envioOriginal.calle,
            envioOriginal.colonia,
            envioOriginal.codigoPostal
                ? `C.P. ${envioOriginal.codigoPostal}`
                : "",
            envioOriginal.municipio,
            envioOriginal.estado
        ].filter(Boolean).join(", ") ||
        "No especificada";

    const factura = body.factura ??
        body.facturacion ??
        {
            necesitaFactura: false
        };

    const subtotal = items.reduce(
        (total, item) => total + item.precio * item.cantidad,
        0
    );

    const costoEnvio = Number(body.costoEnvio || envioOriginal.costo || 0);
    const total = Number(body.total || subtotal + costoEnvio);

    if (!Number.isFinite(total) || total <= 0) {
        throw new Error("El total del pedido no es válido.");
    }

    return {
        cliente: {
            nombre: nombreCliente,
            correo: correoCliente,
            telefono: telefonoCliente
        },
        items,
        envio: {
            direccion
        },
        facturacion: factura,
        subtotal,
        costoEnvio,
        total
    };
}

function crearTransportadorCorreo() {
    const usuario = variableObligatoria("EMAIL_USUARIO");
    const contraseña = variableObligatoria("EMAIL_CONTRASEÑA");

    const opciones = {
        auth: {
            user: usuario,
            pass: contraseña
        }
    };

    if (process.env.EMAIL_HOST) {
        opciones.host = process.env.EMAIL_HOST;
        opciones.port = Number(process.env.EMAIL_PORT || 587);
        opciones.secure = String(process.env.EMAIL_SECURE) === "true";
    } else {
        opciones.service = process.env.EMAIL_SERVICIO || "gmail";
    }

    return nodemailer.createTransport(opciones);
}

async function crearPreferenciaMercadoPago(pedido, orderId) {
    const token = variableObligatoria("MERCADO_PAGO_TOKEN");

    const items = pedido.items.map((item) => ({
        title: item.nombre,
        unit_price: item.precio,
        quantity: item.cantidad,
        currency_id: "MXN"
    }));

    if (pedido.costoEnvio > 0) {
        items.push({
            title: "Envío",
            unit_price: pedido.costoEnvio,
            quantity: 1,
            currency_id: "MXN"
        });
    }

    const preferencia = {
        items,
        external_reference: orderId,
        payer: {
            name: pedido.cliente.nombre
        },
        metadata: {
            order_id: orderId,
            cliente: pedido.cliente,
            logistica: pedido.envio,
            facturacion: pedido.facturacion,
            items: pedido.items,
            subtotal: pedido.subtotal,
            costo_envio: pedido.costoEnvio,
            total: pedido.total
        }
    };

    if (pedido.cliente.correo) {
        preferencia.payer.email = pedido.cliente.correo;
    }

    if (process.env.PUBLIC_BASE_URL) {
        const baseUrl = process.env.PUBLIC_BASE_URL.replace(/\/+$/, "");

        preferencia.notification_url =
            `${baseUrl}/api/mercado-pago/webhook`;

        preferencia.back_urls = {
            success: `${baseUrl}/`,
            failure: `${baseUrl}/`,
            pending: `${baseUrl}/`
        };

        preferencia.auto_return = "approved";
    }

    const respuesta = await fetch(
        "https://api.mercadopago.com/checkout/preferences",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(preferencia)
        }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(
            `Mercado Pago rechazó la preferencia: ${JSON.stringify(datos)}`
        );
    }

    return datos;
}

async function consultarPago(paymentId) {
    const token = variableObligatoria("MERCADO_PAGO_TOKEN");

    const respuesta = await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        }
    );

    if (!respuesta.ok) {
        throw new Error(
            `No se pudo consultar el pago. HTTP ${respuesta.status}`
        );
    }

    return respuesta.json();
}

function obtenerPedidoDesdePago(pago) {
    const orderId = pago.external_reference;
    const pedidoGuardado = pedidosPendientes.get(orderId);

    if (pedidoGuardado) {
        return pedidoGuardado;
    }

    const metadata = pago.metadata;

    if (!metadata) {
        return null;
    }

    return {
        cliente: metadata.cliente || {},
        items: metadata.items || [],
        envio: metadata.logistica || {},
        facturacion: metadata.facturacion || {},
        subtotal: Number(metadata.subtotal || 0),
        costoEnvio: Number(metadata.costo_envio || 0),
        total: Number(metadata.total || pago.transaction_amount || 0)
    };
}

async function enviarCorreoPedido(pedido, pago) {
    const transporter = crearTransportadorCorreo();
    const vendedor = variableObligatoria("EMAIL_DESTINO");
    const destinatarios = [
        vendedor,
        pedido.cliente.correo
    ].filter(Boolean).filter((correo, indice, lista) =>
        lista.indexOf(correo) === indice
    );

    const folio = String(pago.id);
    const nombreProducto =
        pedido.items[0]?.nombre ||
        pago.description ||
        "Producto";

    const filasProductos = pedido.items.map((item) => `
        <tr>
            <td>${escaparHTML(item.nombre)}</td>
            <td>${escaparHTML(item.color || "No especificado")}</td>
            <td>${escaparHTML(item.cantidad)}</td>
            <td>${dinero(item.precio)}</td>
            <td>${dinero(item.precio * item.cantidad)}</td>
        </tr>
    `).join("");

    const factura = pedido.facturacion || {};
    const facturaHTML = factura.necesitaFactura
        ? `
            <p><strong>RFC:</strong> ${escaparHTML(factura.rfc)}</p>
            <p><strong>Razón social:</strong> ${escaparHTML(factura.razonSocial)}</p>
            <p><strong>C.P. fiscal:</strong> ${escaparHTML(factura.codigoPostal)}</p>
            <p><strong>Uso CFDI:</strong> ${escaparHTML(factura.cfdi)}</p>
        `
        : "<p>No requiere factura.</p>";

    const html = `
        <div style="font-family:Arial,sans-serif;color:#222;max-width:800px;margin:auto">
            <h2>Nuevo pedido confirmado</h2>

            <p>
                <strong>Folio Mercado Pago:</strong>
                ${escaparHTML(folio)}
            </p>

            <p>
                <strong>Estado:</strong>
                ${escaparHTML(pago.status)}
            </p>

            <p>
                <strong>Fecha:</strong>
                ${escaparHTML(pago.date_approved || pago.date_created || "")}
            </p>

            <h3>Productos</h3>

            <table style="border-collapse:collapse;width:100%">
                <thead>
                    <tr style="background:#eeeeee">
                        <th style="padding:8px;border:1px solid #cccccc">
                            Producto
                        </th>
                        <th style="padding:8px;border:1px solid #cccccc">
                            Color
                        </th>
                        <th style="padding:8px;border:1px solid #cccccc">
                            Cantidad
                        </th>
                        <th style="padding:8px;border:1px solid #cccccc">
                            Precio
                        </th>
                        <th style="padding:8px;border:1px solid #cccccc">
                            Subtotal
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${filasProductos}
                </tbody>
            </table>

            <h3>Datos del cliente</h3>
            <p>
                <strong>Nombre:</strong>
                ${escaparHTML(pedido.cliente.nombre)}
            </p>
            <p>
                <strong>Correo:</strong>
                ${escaparHTML(pedido.cliente.correo)}
            </p>
            <p>
                <strong>Teléfono:</strong>
                ${escaparHTML(pedido.cliente.telefono)}
            </p>

            <h3>Logística y envío</h3>
            <p>
                <strong>Dirección:</strong>
                ${escaparHTML(pedido.envio.direccion)}
            </p>

            <div style="margin:24px 0;padding:18px;background:#eef8f1;border:1px solid #b8dec2;border-radius:8px;color:#245b35">
                <h3 style="margin:0 0 8px;color:#245b35">Información de entrega</h3>
                <p style="margin:0;font-size:16px;line-height:1.5">
                    <strong>Tiempo estimado de entrega: De 5 a 10 días hábiles (Envíos a toda la República Mexicana)</strong>
                </p>
            </div>

            <h3>Facturación</h3>
            ${facturaHTML}

            <h3>Importes</h3>
            <p><strong>Subtotal:</strong> ${dinero(pedido.subtotal)}</p>
            <p><strong>Envío:</strong> ${
                pedido.costoEnvio > 0
                    ? dinero(pedido.costoEnvio)
                    : "Gratis"
            }</p>
            <p><strong>Total pagado:</strong> ${dinero(pedido.total)}</p>
        </div>
    `;

    await transporter.sendMail({
        from: `"ABeCe" <${variableObligatoria("EMAIL_USUARIO")}>`,
        to: destinatarios,
        subject: `PEDIDO-WEB #${folio} - ${nombreProducto}`,
        html
    });
}

async function manejarCrearPreferencia(req, res) {
    try {
        const pedido = normalizarPedido(req.body);
        const orderId = crypto.randomUUID();

        pedidosPendientes.set(orderId, pedido);

        const preferencia = await crearPreferenciaMercadoPago(
            pedido,
            orderId
        );

        return res.json({
            orderId,
            preferenceId: preferencia.id,
            init_point: preferencia.init_point
        });
    } catch (error) {
        console.error("Error creando preferencia:", error);

        return res.status(500).json({
            error: "No fue posible iniciar el pago.",
            detalle: error.message
        });
    }
}

app.post(
    ["/api/crear-preferencia", "/api/mercado-pago/create-payment"],
    manejarCrearPreferencia
);

app.post("/api/mercado-pago/webhook", async (req, res) => {
    res.sendStatus(200);

    try {
        const tipo = req.body?.type || req.query.type;
        const paymentId =
            req.body?.data?.id ||
            req.body?.id ||
            req.query["data.id"] ||
            req.query.id;

        if (tipo && tipo !== "payment") {
            return;
        }

        if (!paymentId) {
            console.warn("Webhook recibido sin payment_id.");
            return;
        }

        const idPago = String(paymentId);

        if (
            pagosProcesados.has(idPago) ||
            pagosEnProceso.has(idPago)
        ) {
            return;
        }

        pagosEnProceso.add(idPago);

        const pago = await consultarPago(idPago);

        if (pago.status !== "approved") {
            console.log(
                `El pago ${idPago} tiene estado ${pago.status}.`
            );
            pagosEnProceso.delete(idPago);
            return;
        }

        const pedido = obtenerPedidoDesdePago(pago);

        if (!pedido) {
            throw new Error(
                `No se encontraron los datos del pedido ${idPago}.`
            );
        }

        await enviarCorreoPedido(pedido, pago);

        pagosProcesados.add(idPago);

        if (pago.external_reference) {
            pedidosPendientes.delete(pago.external_reference);
        }

        console.log(
            `Pedido confirmado y correo enviado. Folio: ${idPago}`
        );
    } catch (error) {
        console.error("Error procesando webhook:", error);
    } finally {
        const paymentId =
            req.body?.data?.id ||
            req.body?.id ||
            req.query["data.id"] ||
            req.query.id;

        if (paymentId) {
            pagosEnProceso.delete(String(paymentId));
        }
    }
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
