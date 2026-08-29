
// Función para el botón general de WhatsApp en el Hero
function mostrarMensaje() {
    alert("Gracias por visitar ABeCe. En breve te redirigiremos a nuestro canal de soporte en WhatsApp.");
    window.open("https://wa.me", "_blank"); // Aquí puedes cambiar el número por el tuyo en el futuro
}
 
// ============================================================
// VARIABLES GLOBALES DEL SISTEMA E-COMMERCE
// ============================================================
// CORREGIDO: "carrito" ahora guarda un objeto por producto distinto,
// con su "cantidad", en lugar de repetir el mismo producto una vez
// por cada unidad comprada. Ej: { nombre, precio, cantidad: 3 }
// en lugar de tres entradas idénticas de "Cojín".
let carrito = [];
 
// CORREGIDO: "total" ahora es el TOTAL A PAGAR (subtotal + envío),
// no solo la suma de productos. subtotal y envio se recalculan
// junto con total cada vez que el carrito cambia.
let subtotal = 0;
let envio = 0;
let total = 0;
 
// Reglas de envío (mismas que se muestran en la página)
const COSTO_ENVIO_ESTANDAR = 150;
const UMBRAL_ENVIO_GRATIS = 1600;
 
// Clave usada para guardar el carrito en el navegador del cliente
const CLAVE_CARRITO_STORAGE = "abece_carrito";
 
// ============================================================
// NUEVO: PERSISTENCIA DEL CARRITO (localStorage)
// ============================================================
// Guarda el carrito actual en el navegador. Se llama automáticamente
// cada vez que el carrito cambia (comprar, eliminar, vaciar, pagar).
function guardarCarritoEnStorage() {
    try {
        localStorage.setItem(CLAVE_CARRITO_STORAGE, JSON.stringify(carrito));
    } catch (error) {
        // Si el navegador bloquea localStorage (modo incógnito estricto, etc.)
        // el carrito simplemente seguirá funcionando solo en memoria.
        console.warn("No se pudo guardar el carrito en este navegador:", error);
    }
}
 
// Recupera el carrito guardado (si existe) al cargar cualquier página del sitio.
function cargarCarritoDesdeStorage() {
    try {
        const guardado = localStorage.getItem(CLAVE_CARRITO_STORAGE);
        if (guardado) {
            const datos = JSON.parse(guardado);
            if (Array.isArray(datos)) {
                carrito = datos;
            }
        }
    } catch (error) {
        console.warn("No se pudo leer el carrito guardado:", error);
        carrito = [];
    }
}
 
// ============================================================
// NUEVO: CÁLCULO DE SUBTOTAL, ENVÍO Y TOTAL
// ============================================================
// Antes el "total" solo sumaba productos. Ahora se calcula:
//   Subtotal = suma de (precio × cantidad) de cada producto
//   Envío    = $0 si el subtotal ya llegó a $1,600, si no, $150
//   Total    = Subtotal + Envío
// Con el carrito vacío, el envío también es $0.
function calcularTotales() {
    subtotal = carrito.reduce((acumulado, producto) => {
        return acumulado + (producto.precio * producto.cantidad);
    }, 0);
 
    if (carrito.length === 0) {
        envio = 0;
    } else {
        envio = subtotal >= UMBRAL_ENVIO_GRATIS ? 0 : COSTO_ENVIO_ESTANDAR;
    }
 
    total = subtotal + envio;
}
 
// 1. FUNCIÓN PARA ABRIR Y CERRAR EL CARRITO DESLIZANTE LATERAL
function alternarCarrito(event) {
    if (event) event.preventDefault(); // Evita que la página salte al dar clic en '#'
 
    const carritoHtml = document.getElementById("carrito-compras");
 
    if (carritoHtml.classList.contains("carrito-cerrado")) {
        carritoHtml.classList.remove("carrito-cerrado");
        carritoHtml.classList.add("carrito-abierto");
    } else {
        carritoHtml.classList.remove("carrito-abierto");
        carritoHtml.classList.add("carrito-cerrado");
    }
}
 
// 2. FUNCIÓN AL DAR CLIC EN "COMPRAR AHORA" EN LAS VITRINAS
function comprarProducto(nombre, precio) {
    // CORREGIDO: si el producto ya está en el carrito, solo aumentamos
    // su cantidad en lugar de crear una fila duplicada.
    const productoExistente = carrito.find(function (producto) {
        return producto.nombre === nombre && producto.precio === precio;
    });
 
    if (productoExistente) {
        productoExistente.cantidad += 1;
    } else {
        carrito.push({ nombre: nombre, precio: precio, cantidad: 1 });
    }
 
    // Recalculamos subtotal, envío y total
    calcularTotales();
 
    // Guardamos el carrito para que sobreviva a un refresh o cierre de pestaña
    guardarCarritoEnStorage();
 
    // Actualizamos los datos en pantalla
    actualizarPantallaCarrito();
 
    // Experiencia Pro: Abre el carrito de forma automática deslizándose al agregar
    const carritoHtml = document.getElementById("carrito-compras");
    carritoHtml.classList.remove("carrito-cerrado");
    carritoHtml.classList.add("carrito-abierto");
}
 
// 3. FUNCIÓN QUE DIBUJA EL CARRITO LATERAL Y ACTUALIZA EL CONTADOR DEL MENÚ
function actualizarPantallaCarrito() {
    const listaHtml = document.getElementById("lista-carrito");
    const totalHtml = document.getElementById("total-precio");
    const contadorHtml = document.getElementById("contador-productos");
 
    // Limpiamos la lista para evitar duplicar textos viejos
    listaHtml.innerHTML = "";
 
    // Recorremos el carrito y dibujamos cada producto UNA sola vez,
    // mostrando su cantidad y el subtotal de esa línea.
    carrito.forEach((producto, indice) => {
        const elementoLista = document.createElement("li");
        elementoLista.style.display = "flex";
        elementoLista.style.justifyContent = "space-between";
        elementoLista.style.alignItems = "center";
        elementoLista.style.marginBottom = "8px";
 
        // Texto descriptivo del artículo: Nombre, cantidad y subtotal de esa línea
        const subtotalProducto = producto.precio * producto.cantidad;
        const textoProducto = document.createElement("span");
        textoProducto.innerText =
            producto.nombre +
            " · Cantidad: " + producto.cantidad +
            " · $" + producto.precio.toLocaleString('es-MX') + " c/u" +
            " · Subtotal: $" + subtotalProducto.toLocaleString('es-MX') + " MXN";
 
        // Botón con la X roja discreta (elimina la línea completa de ese producto)
        const botonEliminar = document.createElement("button");
        botonEliminar.innerText = "❌";
        botonEliminar.setAttribute("aria-label", "Quitar " + producto.nombre + " del carrito");
        botonEliminar.style.background = "transparent";
        botonEliminar.style.padding = "2px 5px";
        botonEliminar.style.fontSize = "10px";
        botonEliminar.style.border = "none";
        botonEliminar.style.cursor = "pointer";
 
        // Asignamos la acción para eliminar solo este producto
        botonEliminar.onclick = function() {
            eliminarProductoIndividual(indice);
        };
 
        elementoLista.appendChild(textoProducto);
        elementoLista.appendChild(botonEliminar);
        listaHtml.appendChild(elementoLista);
    });
 
    // NUEVO: desglose de Subtotal / Envío, insertado justo antes de la línea de Total.
    // Se genera aquí mismo por JavaScript (sin tocar el HTML): la primera vez se crea,
    // las siguientes veces solo se actualiza su texto.
    mostrarDesgloseCarrito();
 
    // Sincronizamos las cifras en pantalla. "total-precio" ahora es el TOTAL A PAGAR
    // (productos + envío), no solo la suma de productos.
    totalHtml.innerText = total.toLocaleString('es-MX');
 
    if (contadorHtml) {
        // CORREGIDO: el contador ahora suma las cantidades reales de cada línea,
        // no el número de líneas distintas (antes coincidían, ahora ya no).
        const totalUnidades = carrito.reduce((acumulado, producto) => acumulado + producto.cantidad, 0);
        contadorHtml.innerText = totalUnidades;
    }
}
 
// NUEVO: crea (la primera vez) o actualiza el bloque de Subtotal / Envío
// justo arriba de la línea de "Total" del carrito lateral, sin necesidad
// de agregar nada manualmente en el HTML.
function mostrarDesgloseCarrito() {
    const totalHtml = document.getElementById("total-precio");
    if (!totalHtml) return;
 
    // El párrafo que contiene "Total: $... MXN" (el padre de #total-precio)
    const parrafoTotal = totalHtml.closest("p");
    if (!parrafoTotal) return;
 
    let desglose = document.getElementById("desglose-carrito");
 
    if (!desglose) {
        desglose = document.createElement("div");
        desglose.id = "desglose-carrito";
        desglose.style.fontSize = "13.5px";
        desglose.style.margin = "4px 0 10px";
        desglose.style.opacity = "0.85";
        parrafoTotal.parentNode.insertBefore(desglose, parrafoTotal);
    }
 
    const textoEnvio = envio === 0 ? "Gratis" : ("$" + envio.toLocaleString('es-MX') + " MXN");
 
    desglose.innerHTML =
        "Subtotal: $" + subtotal.toLocaleString('es-MX') + " MXN<br>" +
        "Envío: " + textoEnvio;
}
 
// 4. FUNCIÓN DEL BOTÓN (X) PARA ELIMINAR UN SOLO ARTÍCULO
function eliminarProductoIndividual(indice) {
    // CORREGIDO: como cada línea ahora puede representar más de una unidad,
    // simplemente quitamos la línea completa y recalculamos todo desde cero
    // con calcularTotales(), en lugar de restar precios a mano.
    carrito.splice(indice, 1);
    calcularTotales();
    guardarCarritoEnStorage();
    actualizarPantallaCarrito();
}
 
// 5. FUNCIÓN DEL BOTÓN "VACIAR CARRITO"
function vaciarCarrito() {
    if (carrito.length === 0) {
        alert("El carrito ya está vacío.");
        return;
    }
    carrito = [];
    calcularTotales();
    guardarCarritoEnStorage();
    actualizarPantallaCarrito();
    alert("Se han eliminado todos los productos del carrito.");
}
 
// 6. FUNCIÓN QUE ABRE EL MODAL DE PAGO Y DESPLAZA LA PANTALLA
function abrirCheckoutGlobal() {
    if (carrito.length === 0) {
        alert("🛒 Tu carrito está vacío. ¡Agrega algún producto de ABeCe antes de finalizar tu compra!");
        return;
    }
 
    const modal = document.getElementById("modal-pago");
    const txtTotal = document.getElementById("checkout-total");
    const txtProducto = document.getElementById("checkout-producto");
 
    // Limpiamos el formulario anterior por seguridad
    document.getElementById("form-checkout").reset();
    document.getElementById("campos-fiscales").className = "oculto-fiscal";
 
    // Aseguramos que los totales mostrados en el checkout estén frescos
    calcularTotales();
 
    const totalUnidades = carrito.reduce((acumulado, producto) => acumulado + producto.cantidad, 0);
    const textoEnvio = envio === 0 ? "Gratis" : ("$" + envio.toLocaleString('es-MX') + " MXN");
 
    // Inyectamos la información del acumulado real en las etiquetas correspondientes,
    // ahora con el desglose de Subtotal / Envío / Total.
    txtProducto.innerHTML = "Has seleccionado: <strong>" + totalUnidades + " artículo(s)</strong> en tu carrito.";
    txtTotal.innerHTML =
        "Subtotal: $" + subtotal.toLocaleString('es-MX') + " MXN<br>" +
        "Envío: " + textoEnvio + "<br>" +
        "<strong>Total a pagar: $" + total.toLocaleString('es-MX') + ".00 MXN</strong>";
 
    // Mostramos la ventana modal quitando la clase que la esconde
    modal.classList.remove("modal-oculto");
    modal.classList.add("modal-visible");
 
    // Desplazamiento automático suave hacia la zona del Checkout
    modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
 
function cerrarCheckout() {
    const modal = document.getElementById("modal-pago");
    modal.classList.remove("modal-visible");
    modal.classList.add("modal-oculto");
}
 
// 7. MÓDULO INTERACTIVO DE FACTURACIÓN (ABRE Y CIERRA LOS CAMPOS FISCALES)
function alternarModuloFiscal() {
    const checkbox = document.getElementById("chk-necesita-factura");
    const camposFiscales = document.getElementById("campos-fiscales");
    const rfcInput = document.getElementById("fisc-rfc");
    const razonInput = document.getElementById("fisc-razon");
    const cpInput = document.getElementById("fisc-cp");
    const cfdiSelect = document.getElementById("fisc-cfdi");
 
    if (checkbox.checked) {
        camposFiscales.className = "visible-fiscal";
        // Volvemos obligatorios los campos del SAT si la casilla está marcada
        rfcInput.required = true;
        razonInput.required = true;
        cpInput.required = true;
        cfdiSelect.required = true;
    } else {
        camposFiscales.className = "oculto-fiscal";
        // Quitamos la obligatoriedad si no requiere factura
        rfcInput.required = false;
        razonInput.required = false;
        cpInput.required = false;
        cfdiSelect.required = false;
    }
}
 
// 8. FINALIZACIÓN DE COMPRA Y REDIRECCIÓN BANCARIA (ACTUALIZADO CON VALIDACIÓN)
function procesarPagoBancario(event) {
    event.preventDefault(); // Detiene el reinicio automático de la página
 
    const nombreCliente = document.getElementById("chk-nombre").value;
    const correoCliente = document.getElementById("chk-correo").value;
    const telefonoCliente = document.getElementById("chk-telefono").value;
    const pideFactura = document.getElementById("chk-necesita-factura").checked;
 
    // 💡 CAPTURA Y UNIFICACIÓN AUTOMÁTICA DE LA DIRECCIÓN
    const calle = document.getElementById("chk-calle").value;
    const colonia = document.getElementById("chk-colonia").value;
    const cp = document.getElementById("chk-cp").value;
    const municipio = document.getElementById("chk-municipio").value;
    const estado = document.getElementById("chk-estado").value;
 
    // Formateamos la dirección completa en una sola línea profesional
    const direccionCompletaUnificada = `${calle}, Col. ${colonia}, C.P. ${cp}, ${municipio}, ${estado}.`;
 
    let mensajeFiscal = "";
    if (pideFactura) {
        const rfc = document.getElementById("fisc-rfc").value;
        const cfdi = document.getElementById("fisc-cfdi").value;
        mensajeFiscal = "\n📝 Datos Fiscales validados para el RFC: " + rfc + " (Uso CFDI: " + cfdi + ")";
    }
 
    // Aseguramos que el total incluya el envío antes de mostrarlo/cobrarlo
    calcularTotales();
 
    // Alerta de confirmación con la dirección armada
    alert(
        "✨ ¡Gracias por tu compra, " + nombreCliente + "! ✨\n\n" +
        "📦 Orden de entrega registrada en:\n" + direccionCompletaUnificada + "\n" +
        mensajeFiscal + "\n\n" +
        "Te redirigiremos de forma 100% segura a la pasarela bancaria de Mercado Pago para procesar tu pago de $" +
        total.toLocaleString('es-MX') + " MXN con tarjeta (incluye envío)."
    );
 
    // (El resto de tu función window.open, vaciar carrito y cerrar checkout se queda exactamente igual)
    window.open("https://mercadopago.com", "_blank");
    carrito = [];
    calcularTotales();
    guardarCarritoEnStorage();
    actualizarPantallaCarrito();
    cerrarCheckout();
}
 
// Función exclusiva para el formulario de la página contacto.html
function enviarMensajeContacto(event) {
    event.preventDefault(); // Detiene el reinicio automático de la página
 
    const nombre = document.getElementById("fc-nombre").value;
 
    alert("✉️ ¡Gracias por escribirnos, " + nombre + "!\n\nHemos recibido tu mensaje de forma exitosa en ventasabece@gmail.com. Un asesor de ABeCe se pondrá en contacto contigo muy pronto.");
 
    // Resetea los campos de texto
    document.getElementById("form-comunidad").reset();
}
 
// CONTROLADOR DE LUPA FIJA AL COSTADO (SOLUCIÓN CONTRA SOBREPOSICIONES)
function ejecutarLupa(e, contenedor) {
    const img = contenedor.querySelector('.img-base-lupa');
    const lente = contenedor.querySelector('.lupa-lente');
 
    // Encendemos la ventana lateral
    lente.style.display = "block";
 
    // Obtenemos la posición del contenedor actual
    const rect = contenedor.getBoundingClientRect();
 
    // Calculamos las coordenadas del mouse dentro de tu ficha técnica
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
 
    // Convertimos las coordenadas a porcentajes exactos (0% a 100%)
    const porcenX = (x / contenedor.offsetWidth) * 100;
    const porcenY = (y / contenedor.offsetHeight) * 100;
 
    // Cargamos tu ficha técnica gigante (Zoom 250%) en el recuadro lateral
    lente.style.backgroundImage = "url('" + img.src + "')";
    lente.style.backgroundSize = (contenedor.offsetWidth * 2.5) + "px " + (contenedor.offsetHeight * 2.5) + "px";
 
    // Movemos el fondo milimétricamente según el porcentaje del puntero
    lente.style.backgroundPosition = porcenX + "% " + porcenY + "%";
}
 
function apagarLupa(contenedor) {
    // Apaga la ventana lateral cuando el cliente quita el mouse
    const lente = contenedor.querySelector('.lupa-lente');
    lente.style.display = "none";
}
 
// CONTROLADOR DEL SLIDER INTERACTIVO DE LA NUBE DE SUEÑOS (ESPINOZA SOUND LAB)
const slidesBanner = document.querySelectorAll('.slide');
const dotsBanner = document.querySelectorAll('.dot');
const pillBanner = document.getElementById('stagePill');
const labelsBanner = ['Los primeros abrazos', 'Noches de sueño profundo', 'Horas de juego y risas'];
let indexBanner = 0;
 
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 
function goToBanner(n) {
    slidesBanner[indexBanner].classList.remove('active');
    dotsBanner[indexBanner].classList.remove('active');
    indexBanner = n;
    slidesBanner[indexBanner].classList.add('active');
    dotsBanner[indexBanner].classList.add('active');
    pillBanner.textContent = labelsBanner[indexBanner];
}
 
dotsBanner.forEach(d => d.addEventListener('click', () => goToBanner(parseInt(d.dataset.i))));
 
if (!reduceMotion) {
    setInterval(() => goToBanner((indexBanner + 1) % slidesBanner.length), 4200);
}
 
// ============================================================
// NUEVO: AL CARGAR CUALQUIER PÁGINA DEL SITIO, RECUPERAMOS EL
// CARRITO GUARDADO (SI EXISTE) Y PINTAMOS EL CARRITO/CONTADOR
// DE INMEDIATO, ANTES DE QUE EL USUARIO ABRA EL CARRITO.
// ============================================================
cargarCarritoDesdeStorage();
calcularTotales();
actualizarPantallaCarrito();
