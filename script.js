// Función para el botón general de WhatsApp en el Hero
function mostrarMensaje() {
    alert("Gracias por visitar ABECE. En breve te redirigiremos a nuestro canal de soporte en WhatsApp.");
    window.open("https://wa.me", "_blank"); // Aquí puedes cambiar el número por el tuyo en el futuro
}

// Variables globales del sistema e-commerce
let carrito = [];
let total = 0;

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
    // Agregamos el producto al arreglo virtual
    carrito.push({ nombre: nombre, precio: precio });
    
    // Sumamos el valor numérico al total general
    total += precio;

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

    // Recorremos el carrito y dibujamos cada elemento con su botón individual de eliminación (X)
    carrito.forEach((producto, indice) => {
        const elementoLista = document.createElement("li");
        elementoLista.style.display = "flex";
        elementoLista.style.justify = "space-between";
        elementoLista.style.alignItems = "center";
        elementoLista.style.marginBottom = "8px";
        
        // Texto descriptivo del artículo
        const textoProducto = document.createElement("span");
        textoProducto.innerText = producto.nombre + " - $" + producto.precio.toLocaleString('es-MX') + " MXN";
        
        // Botón con la X roja discreta
        const botonEliminar = document.createElement("button");
        botonEliminar.innerText = "❌";
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

    // Sincronizamos las cifras en la pantalla
    totalHtml.innerText = total.toLocaleString('es-MX');
    if (contadorHtml) {
        contadorHtml.innerText = carrito.length;
    }
}

// 4. FUNCIÓN DEL BOTÓN (X) PARA ELIMINAR UN SOLO ARTÍCULO
function eliminarProductoIndividual(indice) {
    total -= carrito[indice].precio;
    carrito.splice(indice, 1);
    
    // Reseteamos a ceros absolutos si el carrito se queda vacío
    if (carrito.length === 0) {
        total = 0;
    }
    actualizarPantallaCarrito();
}

// 5. FUNCIÓN DEL BOTÓN "VACIAR CARRITO"
function vaciarCarrito() {
    if (carrito.length === 0) {
        alert("El carrito ya está vacío.");
        return;
    }
    carrito = [];
    total = 0;
    actualizarPantallaCarrito();
    alert("Se han eliminado todos los productos del carrito.");
}

// 6. FUNCIÓN QUE ABRE EL MODAL DE PAGO Y DESPLAZA LA PANTALLA
function abrirCheckoutGlobal() {
    if (carrito.length === 0) {
        alert("🛒 Tu carrito está vacío. ¡Agrega algún producto de ABECE antes de finalizar tu compra!");
        return;
    }

    const modal = document.getElementById("modal-pago");
    const txtTotal = document.getElementById("checkout-total");
    const txtProducto = document.getElementById("checkout-producto");

    // Limpiamos el formulario anterior por seguridad
    document.getElementById("form-checkout").reset();
    document.getElementById("campos-fiscales").className = "oculto-fiscal";

    // Inyectamos la información del acumulado real en las etiquetas correspondientes
    txtProducto.innerHTML = "Has seleccionado: <strong>" + carrito.length + " artículo(s)</strong> en tu carrito.";
    txtTotal.innerHTML = "Total a pagar: <strong>$" + total.toLocaleString('es-MX') + ".00 MXN</strong>";

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

// 8. FINALIZACIÓN DE COMPRA Y REDIRECCIÓN BANCARIA (SAM'S / WALMART STYLE)
function procesarPagoBancario(event) {
    event.preventDefault(); // Detiene el reinicio automático de la página

    const nombreCliente = document.getElementById("chk-nombre").value;
    const direccionCliente = document.getElementById("chk-direccion").value;
    const pideFactura = document.getElementById("chk-necesita-factura").checked;

    let mensajeFiscal = "";
    if (pideFactura) {
        const rfc = document.getElementById("fisc-rfc").value;
        const cfdi = document.getElementById("fisc-cfdi").value;
        mensajeFiscal = "\n📝 Datos Fiscales validados para el RFC: " + rfc + " (Uso CFDI: " + cfdi + ")";
    }

    // Alerta de confirmación de cierre exitoso del diagrama de experiencia
    alert(
        "✨ ¡Gracias por tu compra, " + nombreCliente + "! ✨\n\n" +
        "📦 Orden de entrega registrada en:\n" + direccionCliente + "\n" +
        mensajeFiscal + "\n\n" +
        "Te redirigiremos de forma 100% segura a la pasarela bancaria de Mercado Pago para procesar tu pago de $" + total.toLocaleString('es-MX') + " MXN con tarjeta."
    );
    
    // Abre el procesador bancario oficial en internet
    window.open("https://mercadopago.com", "_blank");
    
    // Reseteamos el e-commerce de la memoria de forma limpia y automática
    carrito = [];
    total = 0;
    actualizarPantallaCarrito();
    
    // Cerramos la ventana modal flotante
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
