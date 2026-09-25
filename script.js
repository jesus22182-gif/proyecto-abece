// ============================================================
// VARIABLES GLOBALES DEL SISTEMA E-COMMERCE
// ============================================================
// CORREGIDO: "carrito" ahora guarda un objeto por producto distinto,
// con su "cantidad", en lugar de repetir el mismo producto una vez
// por cada unidad comprada. Ej: { nombre, precio, cantidad: 3 }
// en lugar de tres entradas idénticas de "Cojín".
let carrito = [];
const imagenesProductos = new Map();
 
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
const CLAVE_CHECKOUT_STORAGE = "abece_checkout_resumen";
 
// ============================================================
// NUEVO: PERSISTENCIA DEL CARRITO (localStorage)
// ============================================================
// Guarda el carrito actual en el navegador. Se llama automáticamente
// cada vez que el carrito cambia (comprar, eliminar, vaciar, pagar).
function guardarCarritoEnStorage() {
    try {
        localStorage.setItem(CLAVE_CARRITO_STORAGE, JSON.stringify(carrito));
        localStorage.setItem(CLAVE_CHECKOUT_STORAGE, JSON.stringify({
            productos: carrito,
            subtotal: Number(subtotal),
            envio: Number(envio),
            total: Number(total)
        }));
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

function claveProducto(nombre, precio) {
    return nombre + "|" + precio;
}

function registrarImagenesProductos() {
    document.querySelectorAll("[id^='btn-compra-']").forEach(function (boton) {
        const tarjeta = boton.closest(".tarjeta-producto");
        const imagen = tarjeta && tarjeta.querySelector("img[id^='img-principal-']");
        const datosCompra = boton.getAttribute("onclick") || "";
        const coincidencia = datosCompra.match(/comprarProducto\('(.+)',\s*([0-9.]+)/);

        if (imagen && coincidencia) {
            imagenesProductos.set(
                claveProducto(coincidencia[1], Number(coincidencia[2])),
                imagen.getAttribute("src")
            );
        }
    });
}

function obtenerImagenProducto(producto) {
    return producto.imagen || imagenesProductos.get(claveProducto(producto.nombre, Number(producto.precio))) || "imagenes/logo.png";
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
function comprarProducto(nombre, precio, rutaImagen) {
    // CORREGIDO: si el producto ya está en el carrito, solo aumentamos
    // su cantidad en lugar de crear una fila duplicada.
    const productoExistente = carrito.find(function (producto) {
        return producto.nombre === nombre && producto.precio === precio;
    });

    const imagen = rutaImagen || imagenesProductos.get(claveProducto(nombre, precio));
 
    if (productoExistente) {
        productoExistente.cantidad += 1;
        if (imagen) productoExistente.imagen = imagen;
    } else {
        carrito.push({ nombre: nombre, precio: precio, cantidad: 1, imagen: imagen || "imagenes/logo.png" });
    }
 
    // Recalculamos subtotal, envío y total
    calcularTotales();
 
    // Guardamos el carrito para que sobreviva a un refresh o cierre de pestaña
    guardarCarritoEnStorage();
 
    // Actualizamos los datos en pantalla
    actualizarPantallaCarrito();
 
    // Comprar Ahora lleva directamente al checkout con el producto ya guardado.
    window.location.href = "checkout.html";
}
 
// 3. FUNCIÓN QUE DIBUJA EL CARRITO LATERAL Y ACTUALIZA EL CONTADOR DEL MENÚ
function actualizarPantallaCarrito() {
    const listaHtml = document.getElementById("lista-carrito");
    const totalHtml = document.getElementById("total-precio");
    const contadorHtml = document.getElementById("contador-productos");

    if (!listaHtml || !totalHtml) return;
 
    // Limpiamos la lista para evitar duplicar textos viejos
    listaHtml.innerHTML = "";
 
    // Recorremos el carrito y dibujamos cada producto UNA sola vez,
    // mostrando su cantidad y el subtotal de esa línea.
    carrito.forEach((producto, indice) => {
        const elementoLista = document.createElement("li");
        elementoLista.className = "item-carrito";
 
        // Texto descriptivo del artículo: Nombre, cantidad y subtotal de esa línea
        const subtotalProducto = producto.precio * producto.cantidad;
        const textoProducto = document.createElement("div");
        textoProducto.className = "detalle-carrito";
        textoProducto.innerHTML =
            "<strong>" + producto.nombre + "</strong>" +
            "<span>$" + producto.precio.toLocaleString('es-MX') + " c/u · $" + subtotalProducto.toLocaleString('es-MX') + " MXN</span>";

        const controlesCantidad = document.createElement("div");
        controlesCantidad.className = "selector-cantidad";

        const botonMenos = document.createElement("button");
        botonMenos.type = "button";
        botonMenos.className = "boton-cantidad";
        botonMenos.innerText = producto.cantidad === 1 ? "🗑" : "−";
        botonMenos.setAttribute("aria-label", producto.cantidad === 1 ? "Eliminar " + producto.nombre : "Disminuir cantidad de " + producto.nombre);
        botonMenos.onclick = function() { actualizarCantidad(indice, -1); };

        const cantidad = document.createElement("span");
        cantidad.className = "valor-cantidad";
        cantidad.innerText = producto.cantidad;
        cantidad.setAttribute("aria-label", "Cantidad: " + producto.cantidad);

        const botonMas = document.createElement("button");
        botonMas.type = "button";
        botonMas.className = "boton-cantidad";
        botonMas.innerText = "+";
        botonMas.setAttribute("aria-label", "Aumentar cantidad de " + producto.nombre);
        botonMas.onclick = function() { actualizarCantidad(indice, 1); };

        controlesCantidad.appendChild(botonMenos);
        controlesCantidad.appendChild(cantidad);
        controlesCantidad.appendChild(botonMas);
 
        // Botón con la X roja discreta (elimina la línea completa de ese producto)
        const botonEliminar = document.createElement("button");
        botonEliminar.innerText = "×";
        botonEliminar.className = "boton-eliminar-carrito";
        botonEliminar.setAttribute("aria-label", "Quitar " + producto.nombre + " del carrito");
 
        // Asignamos la acción para eliminar solo este producto
        botonEliminar.onclick = function() {
            eliminarProductoIndividual(indice);
        };
 
        const acciones = document.createElement("div");
        acciones.className = "acciones-carrito";
        acciones.appendChild(controlesCantidad);
        acciones.appendChild(botonEliminar);

        elementoLista.appendChild(textoProducto);
        elementoLista.appendChild(acciones);
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

function actualizarCantidad(indice, cambio) {
    const producto = carrito[indice];
    if (!producto) return;

    producto.cantidad += cambio;
    if (producto.cantidad <= 0) carrito.splice(indice, 1);

    calcularTotales();
    guardarCarritoEnStorage();
    actualizarPantallaCarrito();
    if (typeof renderizarCheckout === "function") renderizarCheckout();
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
 
// 6. FUNCIÓN QUE GUARDA EL CARRITO Y ABRE LA PÁGINA DE CHECKOUT
function abrirCheckoutGlobal() {
    if (carrito.length === 0) {
        alert("🛒 Tu carrito está vacío. ¡Agrega algún producto de ABeCe antes de finalizar tu compra!");
        return;
    }

    calcularTotales();
    guardarCarritoEnStorage();
    window.location.href = "checkout.html";
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
 
async function procesarPagoBancario(event) {
    event.preventDefault();

    calcularTotales();

    const nombreCliente = document.getElementById("chk-nombre").value.trim();
    const correoCliente = document.getElementById("chk-correo").value.trim();
    const telefonoCliente = document.getElementById("chk-telefono").value.trim();

    const calle = document.getElementById("chk-calle").value.trim();
    const colonia = document.getElementById("chk-colonia").value.trim();
    const cp = document.getElementById("chk-cp").value.trim();
    const municipio = document.getElementById("chk-municipio").value.trim();
    const estado = document.getElementById("chk-estado").value.trim();

    const necesitaFactura =
        document.getElementById("chk-necesita-factura").checked;

    const pedido = {
        cliente: {
            nombre: nombreCliente,
            correo: correoCliente,
            telefono: telefonoCliente
        },

        envio: {
            calle,
            colonia,
            codigoPostal: cp,
            municipio,
            estado,
            direccionCompleta:
                `${calle}, Col. ${colonia}, C.P. ${cp}, ${municipio}, ${estado}.`
        },

        facturacion: {
            necesitaFactura,
            rfc: necesitaFactura
                ? document.getElementById("fisc-rfc").value.trim()
                : "",
            razonSocial: necesitaFactura
                ? document.getElementById("fisc-razon").value.trim()
                : "",
            codigoPostal: necesitaFactura
                ? document.getElementById("fisc-cp").value.trim()
                : "",
            cfdi: necesitaFactura
                ? document.getElementById("fisc-cfdi").value
                : ""
        },

        items: carrito.map(producto => ({
            title: producto.nombre,
            price: Number(producto.precio),
            quantity: Number(producto.cantidad)
        })),

        customerInfo: {
            nombre: nombreCliente,
            correo: correoCliente,
            telefono: telefonoCliente
        },

        subtotal: Number(subtotal),
        costoEnvio: Number(envio),
        total: Number(total)
    };

    try {
        const respuesta = await fetch("http://localhost:3000/api/mercado-pago/create-payment", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(pedido)
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos.error || "No se pudo iniciar el pago.");
        }

        // No vaciamos el carrito todavía.
        // El correo y el folio oficial se generan únicamente
        // después de que el webhook confirma el pago.
        window.location.href = datos.init_point;
    } catch (error) {
        console.error(error);
        alert("No fue posible iniciar el pago. Intenta nuevamente.");
    }
}

// ==========================================================
// ABeCe — CONTROLADOR DE LUPA DE PRODUCTOS
// ==========================================================

function ejecutarLupa(e, contenedor) {

    const img = contenedor.querySelector('.img-base-lupa');
    const lente = contenedor.querySelector('.lupa-lente');

    if (!img || !lente) {
        return;
    }

    // Mostrar la lupa
    lente.style.display = "block";

    const contenedorRect = contenedor.getBoundingClientRect();
    const anchoLente = lente.offsetWidth || 400;
    const separacion = 20;
    const espacioDerecho = window.innerWidth - contenedorRect.right;
    const espacioIzquierdo = contenedorRect.left;
    const abrirIzquierda = espacioDerecho < anchoLente + separacion && espacioIzquierdo >= anchoLente + separacion;

    if (abrirIzquierda || espacioIzquierdo > espacioDerecho) {
        lente.style.left = "auto";
        lente.style.right = `calc(100% + ${separacion}px)`;
    } else {
        lente.style.right = "auto";
        lente.style.left = `calc(100% + ${separacion}px)`;
    }

    // Obtener dimensiones reales de la imagen
    const rect = img.getBoundingClientRect();

    // Posición del mouse dentro de la imagen
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convertir posición a porcentaje
    const porcentajeX = (x / rect.width) * 100;
    const porcentajeY = (y / rect.height) * 100;

    // Zoom
    const zoom = 2.5;

    // Colocar la imagen dentro de la lupa
    lente.style.backgroundImage = `url("${img.src}")`;

    lente.style.backgroundSize =
        `${rect.width * zoom}px ${rect.height * zoom}px`;

    // Mover la imagen ampliada
    lente.style.backgroundPosition =
        `${porcentajeX}% ${porcentajeY}%`;
}


function apagarLupa(contenedor) {

    const lente = contenedor.querySelector('.lupa-lente');

    if (!lente) {
        return;
    }

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
    if (!slidesBanner.length || !dotsBanner.length || !pillBanner) return;

    slidesBanner[indexBanner].classList.remove('active');
    dotsBanner[indexBanner].classList.remove('active');
    indexBanner = n;
    slidesBanner[indexBanner].classList.add('active');
    dotsBanner[indexBanner].classList.add('active');
    pillBanner.textContent = labelsBanner[indexBanner];
}
 
dotsBanner.forEach(d => d.addEventListener('click', () => goToBanner(parseInt(d.dataset.i, 10))));
 
if (slidesBanner.length > 1 && dotsBanner.length === slidesBanner.length && !reduceMotion) {
    setInterval(() => goToBanner((indexBanner + 1) % slidesBanner.length), 4200);
}

const botonMenu = document.getElementById('boton-menu');
const menuPrincipal = document.getElementById('menu-principal');

function alternarMenu() {
    if (!botonMenu || !menuPrincipal) return;

    const menuAbierto = menuPrincipal.classList.toggle('menu-abierto');
    botonMenu.classList.toggle('menu-abierto', menuAbierto);
    botonMenu.setAttribute('aria-expanded', String(menuAbierto));
    botonMenu.setAttribute('aria-label', menuAbierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
}

if (botonMenu && menuPrincipal) {
    botonMenu.addEventListener('click', alternarMenu);
    menuPrincipal.addEventListener('click', event => {
        if (event.target.matches('a')) {
            menuPrincipal.classList.remove('menu-abierto');
            botonMenu.classList.remove('menu-abierto');
            botonMenu.setAttribute('aria-expanded', 'false');
            botonMenu.setAttribute('aria-label', 'Abrir menú de navegación');
        }
    });
}

// Índice de búsqueda del catálogo: cada entrada conserva variantes y su destino.
const indiceProductosABeCe = [
    { nombre: "Cojines de Lactancia", variantes: "Rosa Burbuja, Azul Nube, Blanco Algodón", cardIndex: 0, palabras: "cojin cojines lactancia rosa burbuja azul nube blanco algodon" },
    { nombre: "Cojines de Lactancia Velur", variantes: "Rosa Velur, Azul Velur, Blanco Velur", cardIndex: 1, palabras: "cojin cojines lactancia velur rosa azul blanco" },
    { nombre: "Cojines de Lactancia Bordados", variantes: "Rosa, Azul, Beige", cardIndex: 2, palabras: "cojin cojines lactancia bordado bordados rosa azul beige" },
    { nombre: "Sillón Colchón Antirreflujo", variantes: "Azul Turquesa, Rosa, Blanco, Azul", cardIndex: 3, palabras: "sillon colchon antirreflujo azul turquesa rosa blanco" },
    { nombre: "Cobija Rusia Doble Tela", variantes: "Azul, Rosa, Amarillo", cardIndex: 4, palabras: "cobija rusia doble tela azul rosa amarillo" },
    { nombre: "Cobija Rusia con Oso de Apego", variantes: "Incluye Oso de Apego", cardIndex: 4, palabras: "cobija rusia oso apego" },
    { nombre: "Cobija Burbuja Estampado Tela", variantes: "Azul, Rosa, Amarillo", cardIndex: 5, palabras: "cobija burbuja estampado tela azul rosa amarillo" },
    { nombre: "Almohada con Funda Burbuja", variantes: "Azul, Rosa, Amarillo", cardIndex: 6, palabras: "almohada funda burbuja azul rosa amarillo" },
    { nombre: "Almohada Burbuja Tela", variantes: "Azul, Rosa, Amarillo, Blanco", cardIndex: 7, palabras: "almohada burbuja tela azul rosa amarillo blanco" },
    { nombre: "Colchón Cambiador Curvo Funda Capitoneada", variantes: "Blanco", cardIndex: 8, palabras: "colchon cambiador curvo funda capitoneada blanco" },
    { nombre: "Colchón Cuña Antirreflujo para Bebé Forro Toalla", variantes: "Blanco", cardIndex: 9, palabras: "colchon cuña antirreflujo bebe forro toalla blanco" },
    { nombre: "Colchón para Cuna Viajera Memory Form con Tela Repelente", variantes: "Blanco", cardIndex: 10, palabras: "colchon cuna viajera memory form tela repelente blanco" },
    { nombre: "Colchón para Cuna Viajera Memory Form con Tela Repelente Estampada", variantes: "Azul-Niño, Rosa-Niña", cardIndex: 11, palabras: "colchon cuna viajera memory form tela repelente estampada azul niño rosa niña" },
    { nombre: "Fular para Porteo Canguro Rebozo Porta Bebés Ergonómico", variantes: "Negro, Rosa", cardIndex: 12, palabras: "fular porteo canguro rebozo porta bebes ergonomico negro rosa" },
    { nombre: "Nido Contención Azul / Rosa", variantes: "Incluye Oso de Apego", cardIndex: 13, palabras: "nido contencion azul rosa oso apego" },
    { nombre: "Set de 3 Sabanitas Sabanitas Recibidoras", variantes: "Azul, Rosa", cardIndex: 14, palabras: "set 3 sabanitas recibidoras azul rosa" },
    { nombre: "Sabanitas Recibidoras", variantes: "Azul-gris, Rosa-gris", cardIndex: 15, palabras: "sabanitas recibidoras azul gris rosa" },
    { nombre: "Juego de Sábanas para Cuna", variantes: "Gris", cardIndex: 16, palabras: "juego sabanas cuna gris" },
    { nombre: "Juego de Sábanas para Mini Cuna y Colecho", variantes: "Blanco", cardIndex: 17, palabras: "juego sabanas mini cuna colecho blanco" },
    { nombre: "Cuellera para Soporte de Cabeza", variantes: "Azul, Rosa, Amarillo", cardIndex: 18, palabras: "cuellera soporte cabeza azul rosa amarillo" },
    { nombre: "Cuellera Pequeña", variantes: "Azul, Rosa, Amarillo", cardIndex: 19, palabras: "cuellera pequeña azul rosa amarillo" },
    { nombre: "Cojín Térmico", variantes: "Semillas y hierbas", cardIndex: 20, palabras: "cojin termico colicos semillas hierbas" },
    { nombre: "Oso de Apego Relleno", variantes: "Azul, Rosa, Blanco", cardIndex: 21, palabras: "oso apego relleno azul rosa blanco" },
    { nombre: "Oso de Apego", variantes: "Azul, Rosa, Blanco", cardIndex: 22, palabras: "oso apego sin relleno azul rosa blanco" },
    { nombre: "Saquito para Dormir", variantes: "Mantita para bebé", cardIndex: 23, palabras: "saquito dormir mantita" },
    { nombre: "Andarín", variantes: "Apoyo para primeros pasos", cardIndex: 24, palabras: "andarin primeros pasos" },
    { nombre: "Protector de Cambiador", variantes: "Protección suave", cardIndex: 25, palabras: "protector cambiador" },
    { nombre: "Set de 3 Repetidores", variantes: "Azul, Rosa", cardIndex: 26, palabras: "set repetidores" },
    { nombre: "Toalla Bordada con Capucha", variantes: "Suave para después del baño", cardIndex: 27, palabras: "toalla bordada capucha" },
    { nombre: "Toalla con Capucha de Conejito", variantes: "Suave y acogedora", cardIndex: 28, palabras: "toalla capucha conejito" },
    { nombre: "Set de Toallas Faciales", variantes: "Uso diario", cardIndex: 29, palabras: "set toallas faciales" },
    { nombre: "Edredón para Cuna Viajera con Osito", variantes: "Incluye sábana", cardIndex: 30, palabras: "edredon cuna viajera osito" },
    { nombre: "Edredón para Cuna Viajera", variantes: "Sábana blanca", cardIndex: 31, palabras: "edredon cuna viajera sabana blanca" },
    { nombre: "Edredón para Minicuna con Osito", variantes: "Incluye sábana", cardIndex: 32, palabras: "edredon minicuna osito" },
    { nombre: "Edredón para Minicuna", variantes: "Sábana de algodón", cardIndex: 33, palabras: "edredon minicuna sabana algodon" },
    { nombre: "Edredón para Moisés", variantes: "Sábana blanca", cardIndex: 34, palabras: "edredon moises sabana blanca" },
    { nombre: "Mantita de Apego", variantes: "Suave para sus siestas", cardIndex: 35, palabras: "mantita apego" }
];

function textoBusqueda(texto) {
    return texto.toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function prepararDestinosBusqueda() {
    if (!/productos\.html$/i.test(window.location.pathname)) return;
    const tarjetas = Array.from(document.querySelectorAll('.tarjeta-producto'));
    indiceProductosABeCe.forEach(function (producto, indice) {
        const tarjeta = tarjetas[producto.cardIndex];
        producto.id = producto.id || 'producto-catalogo-' + producto.cardIndex;
        producto.enlace = 'productos.html#' + producto.id;
        if (tarjeta && !tarjeta.id) tarjeta.id = producto.id;
    });
    const destinoHash = window.location.hash ? document.getElementById(window.location.hash.slice(1)) : null;
    if (destinoHash) setTimeout(() => destinoHash.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
}

function iniciarBuscadorABeCe() {
    const formulario = document.getElementById('buscador-abece');
    const entrada = document.getElementById('entrada-busqueda');
    const sugerencias = document.getElementById('sugerencias-busqueda');
    if (!formulario || !entrada || !sugerencias) return;
    indiceProductosABeCe.forEach(producto => {
        producto.id = 'producto-catalogo-' + producto.cardIndex;
        producto.enlace = 'productos.html#' + producto.id;
    });
    prepararDestinosBusqueda();

    function mostrarSugerencias() {
        const consulta = textoBusqueda(entrada.value.trim());
        const resultados = consulta ? indiceProductosABeCe.filter(producto => textoBusqueda(producto.nombre + ' ' + producto.variantes + ' ' + producto.palabras).includes(consulta)).slice(0, 10) : [];
        sugerencias.innerHTML = resultados.map(producto => '<button type="button" class="sugerencia-busqueda" role="option" data-producto-id="' + producto.id + '"><strong>' + producto.nombre + '</strong><small>' + producto.variantes + '</small></button>').join('');
        sugerencias.classList.toggle('visible', resultados.length > 0);
        entrada.setAttribute('aria-expanded', String(resultados.length > 0));
    }

    function abrirResultado(producto) {
        const destino = document.getElementById(producto.id) || document.querySelectorAll('.tarjeta-producto')[producto.cardIndex];
        if (destino) {
            destino.scrollIntoView({ behavior: 'smooth', block: 'center' });
            destino.classList.add('resultado-busqueda');
            setTimeout(() => destino.classList.remove('resultado-busqueda'), 1600);
        } else {
            window.location.href = producto.enlace;
        }
        sugerencias.classList.remove('visible');
        entrada.setAttribute('aria-expanded', 'false');
    }

    entrada.addEventListener('input', mostrarSugerencias);
    sugerencias.addEventListener('click', event => {
        const boton = event.target.closest('[data-producto-id]');
        const producto = boton && indiceProductosABeCe.find(item => item.id === boton.dataset.productoId);
        if (producto) abrirResultado(producto);
    });
    formulario.addEventListener('submit', event => {
        event.preventDefault();
        const consulta = textoBusqueda(entrada.value.trim());
        const producto = indiceProductosABeCe.find(item => textoBusqueda(item.nombre + ' ' + item.variantes + ' ' + item.palabras).includes(consulta));
        if (producto) abrirResultado(producto);
    });
    document.addEventListener('click', event => {
        if (!formulario.contains(event.target)) sugerencias.classList.remove('visible');
    });
}

iniciarBuscadorABeCe();
 
// ============================================================
// NUEVO: AL CARGAR CUALQUIER PÁGINA DEL SITIO, RECUPERAMOS EL
// CARRITO GUARDADO (SI EXISTE) Y PINTAMOS EL CARRITO/CONTADOR
// DE INMEDIATO, ANTES DE QUE EL USUARIO ABRA EL CARRITO.
// ============================================================
cargarCarritoDesdeStorage();
registrarImagenesProductos();
carrito.forEach(function (producto) {
    if (!producto.imagen) producto.imagen = obtenerImagenProducto(producto);
});
calcularTotales();
if (document.getElementById('lista-carrito')) {
    actualizarPantallaCarrito();
}

// CONTROLADOR DE VARIANTES CON VINCULACIÓN A LA LUPA INTERACTIVA ABeCe
function cambiarVarianteCojin(nombreVersion, rutaImagen, precio, botonActivo) {
    // 1. Cambia la imagen que ve el usuario en la pantalla
    const imgBase = document.getElementById('img-principal-cojin');
    imgBase.src = rutaImagen;
    
    // 2. Actualiza el texto descriptivo de la variante
    document.getElementById('nombre-variante-act').innerText = nombreVersion;
    
    // 3. Sincroniza el botón de compra para meter al carrito el color correcto
    document.getElementById('btn-compra-cojin').setAttribute('onclick', `comprarProducto('Cojín de Lactancia (${nombreVersion})', ${precio}, '${rutaImagen}')`);
    
    // 4. Mantenimiento visual de botones activos (estilo swatches)
    const contenedor = botonActivo.closest('.botones-variantes-flex');
    contenedor.querySelectorAll('.btn-variante').forEach(btn => btn.classList.remove('activo'));
    botonActivo.classList.add('activo');
}

    // CONTROLADOR DE VARIANTES UNIVERSAL MULTIPRODUCTO ABeCe
function cambiarVarianteUniversal(productoClave, nombreVersion, rutaImagen, precio, botonActivo) {
    // 1. Sincroniza la imagen base correspondiente
    const imgBase = document.getElementById(`img-principal-${productoClave}`);
    if (imgBase) imgBase.src = rutaImagen;

    // 2. Sincroniza el texto descriptivo del color
    const txtVersion = document.getElementById(`nombre-variante-${productoClave}`);
    if (txtVersion) txtVersion.innerText = nombreVersion;

    // 3. Sincroniza el precio visual independiente
    const txtPrecio = document.getElementById(`precio-${productoClave}`);
    if (txtPrecio) txtPrecio.innerText = `$${precio} MXN`;

    // 4. Sincroniza el botón de compra final inyectando la variable exacta
    const btnCompra = document.getElementById(`btn-compra-${productoClave}`);
    if (btnCompra) {
        // Formateamos el título de salida comercial según el identificador limpio
        let tituloFormateado = 'Producto ABeCe';
        
        switch(productoClave) {
            case 'cojin':
                tituloFormateado = 'Cojín de Lactancia';
                break;
            case 'cojinvelur':
                tituloFormateado = 'Cojín de Lactancia Velur';
                break;
            case 'cojinbordado':
                tituloFormateado = 'Cojín de Lactancia Bordado';
                break;
            case 'sillon':
                tituloFormateado = 'Sillón Colchón Antirreflujo';
                break;
            case 'cobija':
                tituloFormateado = 'Cobija Rusia Doble Tela';
                break;
            case 'cobija-burbuja':
                tituloFormateado = 'Cobija Burbuja Estampada';
                break;
            case 'almohada-con-funda-burbuja':
                tituloFormateado = 'Almohada con Funda Burbuja';
                break;
            case 'almohada-burbuja-tela':
                tituloFormateado = 'Almohada Burbuja Tela';
                break;
            case 'colchon-cambiador-curvo-funda-capitoneada':
                tituloFormateado = 'Colchón Cambiador Curvo Funda Capitoneada';
                break;
            case 'colchon-cuna-antirreflujo-para-bebe-forro-toalla':
                tituloFormateado = 'Colchón Cuña Antirreflujo para Bebé Forro Toalla';
                break;
            case 'colchon-para-cuna-viajera-memory-form-con-tela-repelente':
                tituloFormateado = 'Colchón para Cuna Viajera Memory Form con Tela Repelente';
                break;
            case 'colchon-para-cuna-viajera-memory-form-con-tela-repelente-estampada':
                tituloFormateado = 'Colchón para Cuna Viajera Memory Form con Tela Repelente Estampada';
                break;
            case 'juego-de-sabanas-mini-cuna-colecho-moises':
                tituloFormateado = 'Juego de Sábanas Mini Cuna Colecho Moisés';
                break;
            case 'juego-de-sabanas-cuna':
                tituloFormateado = 'Juego de Sábanas Cuna';
                break;
            case 'sabanitas-recibidoras':
                tituloFormateado = 'Sabanitas Recibidoras';
                break;
            case 'set-de-3-sabanitas-sabanitas-recibidoras':
                tituloFormateado = 'Set de 3 Sábanas Recibidoras';
                break;
            case 'nido-contencion-azul':
                tituloFormateado = 'Nido de Contención';
                break;
            case 'fular-para-porteo-canguro-rebozo-porta-bebes-ergonomico':
                tituloFormateado = 'Fular para Porteo Ergonómico';
                break;
            case 'cuellera-soporte-para-cabeza':
                tituloFormateado = 'Cuellera Soporte para cabeza';
                break;
            case 'cuellera-soporte-para-cabeza-chica':
                tituloFormateado = 'Cuellera Soporte para cabeza chica';
                break;
            case 'cojin-termico-anti-colicos-para-bebe-semillas-y-hierbas':
                tituloFormateado = 'Cojín térmico anti Cólicos para bebé (semillas y hierbas)';
                break;
            case 'oso-de-apego-relleno':
                tituloFormateado = 'Oso de Apego';
                break;
            case 'oso-de-apego-sin-relleno':
                tituloFormateado = 'Oso de Apego (sin relleno)';
                break;
           case  'saquito-para-dormir-para-bebe':
                tituloFormateado = 'Saquito para dormir Para bebe';
                break;
           case  'andarin':
                tituloFormateado = 'ANDARIN';
                break;
           case  'protector-para-colchon-cambiador':
                tituloFormateado = 'protector para colchon cambiador';
                break;
           case  'set-de-3-repetidores-toalla':
                tituloFormateado = 'Set  de 3  Repetidores Toalla';
                break;
           case  'toalla-con-capucha-para-bebe-bordado':
                tituloFormateado = 'toalla con capucha para bebe bordado';
                break;
           case  'toalla-con-capucha-para-bebe-diseno-de-conejo':
                tituloFormateado = 'Toalla con capucha para bebe Diseño de conejo';
                break;
           case  'toalla-facial-para-bebe-100-algodon-7-piezas':
                tituloFormateado = 'Toalla facial para bebe 100% algodón 7 piezas';
                break;
           case  'edredon-para-cuna-viajera-doble-burbuja-con-oso-de-apego':
                tituloFormateado = 'Edredon Para cuna viajera Doble Burbuja Con Oso de apego';
                break;
           case  'edredon-para-cuna-viajera-doble-burbuja-con-sabana-de-cajon-blanco':
                tituloFormateado = 'Edredon Para cuna viajera Doble Burbuja Con sabana de cajon blanco';
                break;
           case  'edredon-para-minicuna-doble-burbuja-con-oso-de-apego':
                tituloFormateado = 'Edredon para minicuna doble / Burbuja Con oso de apego';
                break;
           case  'edredon-para-minicuna-doble-burbuja-con-sabana-de-cajon-algodon':
                tituloFormateado = 'Edredon para minicuna doble / Burbuja Con sabana de cajon algodón';
                break;
           case  'edredon-para-minicuna-moises-incluye-sabana-de-cajon-blanca':
                tituloFormateado = 'Edredón para minicuna Moisés Incluye sabana de cajón blanca';
                break;
           case  'mantita-de-apego-oso':
                tituloFormateado = 'Mantita de apego Oso';
                break;

        }

        btnCompra.setAttribute('onclick', `comprarProducto('${tituloFormateado} (${nombreVersion})', ${precio}, '${rutaImagen}')`);
    }

    // 5. Mapeo estético de swatches activos
    const contenedor = botonActivo.closest('.botones-variantes-flex');
    if (contenedor) {
        contenedor.querySelectorAll('.btn-variante').forEach(btn => btn.classList.remove('activo'));
        botonActivo.classList.add('activo');
    }
}


// CONTROLADOR DE PESTAÑAS DE INFORMACIÓN DE PRODUCTO ABeCe
function alternarTabABeCe(tabIdDestino, botonPresionado) {
    // 1. Localiza el contenedor de la tarjeta actual para no alterar otros productos
    const tarjetaContenedor = botonPresionado.closest('.tarjeta-producto');
    if (!tarjetaContenedor) return;

    // 2. Apaga el contenido que estaba abierto y enciende el seleccionado (Buscando solo dentro de esta tarjeta)
    tarjetaContenedor.querySelectorAll('.contenido-tab-item').forEach(bloque => {
        bloque.classList.remove('activo');
    });
    
    const tabDestino = tarjetaContenedor.querySelector(`#${tabIdDestino}`);
    if (tabDestino) {
        tabDestino.classList.add('activo');
    }

    // 3. Mantenimiento estético de los botones (ilumina la pestaña activa)
    botonPresionado.closest('.tabs-botones-flex').querySelectorAll('.btn-tab').forEach(btn => {
        btn.classList.remove('activo');
    });
    botonPresionado.classList.add('activo');
}





