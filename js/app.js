let DB;

const mascotaInput = document.querySelector('#mascota');
const propietarioInput = document.querySelector('#propietario');
const telefonoInput = document.querySelector('#telefono');
const fechaInput = document.querySelector('#fecha');
const horaInput = document.querySelector('#hora');
const sintomasInput = document.querySelector('#sintomas');

// Contenedor para las citas
const contenedorCitas = document.querySelector('#citas');

// Formulario nuevas citas
const formulario = document.querySelector('#nueva-cita')
formulario.addEventListener('submit', nuevaCita);

// Heading
const heading = document.querySelector('#administra');

let editando = false;

window.onload = ()=> {
    eventListeners();
    crearDB();  // Crear la base de datos
}

// Eventos
function eventListeners() {
    mascotaInput.addEventListener('change', datosCita);
    propietarioInput.addEventListener('change', datosCita);
    telefonoInput.addEventListener('change', datosCita);
    fechaInput.addEventListener('change', datosCita);
    horaInput.addEventListener('change', datosCita);
    sintomasInput.addEventListener('change', datosCita);
}

const citaObj = {
    mascota: '',
    propietario: '',
    telefono: '',
    fecha:'',
    hora:'',
    sintomas:''
}

function datosCita(e) {
     citaObj[e.target.name] = e.target.value;
}

// CLasses
class Citas {
    constructor() {
        this.citas = []
    }
    agregarCita(cita) {
        this.citas = [...this.citas, cita];
    }
    editarCita(citaActualizada) {
        this.citas = this.citas.map(cita => cita.id === citaActualizada.id ? citaActualizada : cita)
    }
    eliminarCita(id) {
        this.citas = this.citas.filter(cita => cita.id !== id);
    }
}

class UI {

    constructor({citas}) {
        this.textoHeading(citas);
    }

    imprimirAlerta(mensaje, tipo) {
        const divMensaje = document.createElement('div');
        divMensaje.classList.add('text-center', 'alert', 'd-block', 'col-12');
        
        if(tipo === 'error') {
             divMensaje.classList.add('alert-danger');
        } else {
             divMensaje.classList.add('alert-success');
        }

        divMensaje.textContent = mensaje;

        document.querySelector('#contenido').insertBefore(divMensaje , document.querySelector('.agregar-cita'));

        setTimeout( () => {
            divMensaje.remove();
        }, 3000);
   }

   imprimirCitas() { 
        this.limpiarHTML();

        const objectStore = DB.transaction('citas', 'readonly').objectStore('citas');

        objectStore.openCursor().onsuccess = function(e) {
            const cursor = e.target.result;

            if(cursor) {
                const cita = cursor.value;

                const divCita = document.createElement('div');
                divCita.classList.add('cita', 'p-3');
                divCita.dataset.id = cita.id;

                divCita.innerHTML = `
                    <h2 class="card-title font-weight-bolder">${cita.mascota}</h2>
                    <p><span class="font-weight-bolder">Propietario: </span>${cita.propietario}</p>
                    <p><span class="font-weight-bolder">Teléfono: </span>${cita.telefono}</p>
                    <p><span class="font-weight-bolder">Fecha: </span>${cita.fecha}</p>
                    <p><span class="font-weight-bolder">Hora: </span>${cita.hora}</p>
                    <p><span class="font-weight-bolder">Síntomas: </span>${cita.sintomas}</p>
                    <button class="btn btn-danger mr-2" onclick="eliminarCita(${cita.id})">Eliminar</button>
                    <button class="btn btn-info" onclick="cargarEdicion(${cita.id})">Editar</button>
                `;

                contenedorCitas.appendChild(divCita);

                cursor.continue();
            }
        }
   }

   textoHeading(citas) {
        if(citas.length > 0 ) {
            heading.textContent = 'Administra tus Citas '
        } else {
            heading.textContent = 'No hay Citas, comienza creando una'
        }
    }

   limpiarHTML() {
        while(contenedorCitas.firstChild) {
            contenedorCitas.removeChild(contenedorCitas.firstChild);
        }
   }
}

const administrarCitas = new Citas();
const ui = new UI(administrarCitas);

// ---------- FUNCIONES PRINCIPALES ----------
function nuevaCita(e) {
    e.preventDefault();

    const {mascota, propietario, telefono, fecha, hora, sintomas } = citaObj;

    if( mascota === '' || propietario === '' || telefono === '' || fecha === ''  || hora === '' || sintomas === '' ) {
        ui.imprimirAlerta('Todos los mensajes son Obligatorios', 'error')
        return;
    }

    if(editando) {
        // Actualiza array local
        administrarCitas.editarCita( {...citaObj} );
        ui.imprimirAlerta('Guardado Correctamente');
        formulario.querySelector('button[type="submit"]').textContent = 'Crear Cita';
        editando = false;

        // ---------- CAMBIO: actualizar en IndexedDB ----------
        const transaction = DB.transaction(['citas'], 'readwrite');
        const objectStore = transaction.objectStore('citas');
        const request = objectStore.put(citaObj);

        request.onsuccess = function() {
            ui.limpiarHTML();
            ui.imprimirCitas();
        }

    } else {
        // Crear nueva cita
        citaObj.id = Date.now();
        administrarCitas.agregarCita({...citaObj});

        // ---------- CAMBIO: guardar en IndexedDB ----------
        const transaction = DB.transaction(['citas'], 'readwrite');
        const objectStore = transaction.objectStore('citas');
        const requestAdd = objectStore.add(citaObj);

        requestAdd.onsuccess = function() {
            console.log('Cita agregada a IndexedDB');
            ui.imprimirAlerta('Se agregó correctamente');
            ui.imprimirCitas();
        }
        requestAdd.onerror = function() {
            console.log('Error al agregar la cita');
        }
    }

    reiniciarObjeto();
    formulario.reset();
}

// Reiniciar objeto
function reiniciarObjeto() {
    citaObj.mascota = '';
    citaObj.propietario = '';
    citaObj.telefono = '';
    citaObj.fecha = '';
    citaObj.hora = '';
    citaObj.sintomas = '';
}

// ---------- ELIMINAR ----------
function eliminarCita(id) {
    const transaction = DB.transaction(['citas'], 'readwrite');
    const objectStore = transaction.objectStore('citas');
    objectStore.delete(id).onsuccess = function() {
        console.log('Cita eliminada de IndexedDB');
        ui.limpiarHTML();
        ui.imprimirCitas();
    }
}

// ---------- EDITAR ----------
function cargarEdicion(id) {
    const transaction = DB.transaction(['citas'], 'readonly');
    const objectStore = transaction.objectStore('citas');
    const requestGet = objectStore.get(id);

    requestGet.onsuccess = function(e) {
        const cita = e.target.result;

        citaObj.mascota = cita.mascota;
        citaObj.propietario = cita.propietario;
        citaObj.telefono = cita.telefono;
        citaObj.fecha = cita.fecha;
        citaObj.hora = cita.hora;
        citaObj.sintomas = cita.sintomas;
        citaObj.id = cita.id;

        mascotaInput.value = cita.mascota;
        propietarioInput.value = cita.propietario;
        telefonoInput.value = cita.telefono;
        fechaInput.value = cita.fecha;
        horaInput.value = cita.hora;
        sintomasInput.value = cita.sintomas;

        formulario.querySelector('button[type="submit"]').textContent = 'Guardar Cambios';
        editando = true;
    }
}

// ---------- CREAR DB ----------
function crearDB() {
    const crearDB = window.indexedDB.open('citas', 1);

    crearDB.onerror = function() {
        console.log('Hubo un error');
    }

    crearDB.onsuccess = function() {
        console.log('Base de datos creada');
        DB = crearDB.result;
        ui.imprimirCitas();
    }

    crearDB.onupgradeneeded = function(e) {
        const db = e.target.result;
        const objectStore = db.createObjectStore('citas', {
            keyPath: 'id',
            autoIncrement: true
        });

        objectStore.createIndex('mascota', 'mascota', { unique: false });
        objectStore.createIndex('propietario', 'propietario', { unique: false });
        objectStore.createIndex('telefono', 'telefono', { unique: false });
        objectStore.createIndex('fecha', 'fecha', { unique: false });
        objectStore.createIndex('hora', 'hora', { unique: false });
        objectStore.createIndex('sintomas', 'sintomas', { unique: false });
        objectStore.createIndex('id', 'id', { unique: true });
        console.log('Base de datos creada y lista');
    }
}
