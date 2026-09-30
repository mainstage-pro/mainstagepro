const filas = [{ id: 1, monto: 1000 }, { id: 2, monto: 1500 }, { id: 3, monto: 1750 }];
const entradas = [
  { monto: 2250, metodo: "EFECTIVO", cuenta: "Caja" },
  { monto: 2000, metodo: "TRANSFERENCIA", cuenta: "Banorte" }
];

let entradaIdx = 0;
let entradaRestante = entradas[0].monto;

for (const fila of filas) {
  let filaMonto = fila.monto;
  
  // A fila could be covered by multiple entradas
  while (filaMonto > 0.001 && entradaIdx < entradas.length) {
    const entrada = entradas[entradaIdx];
    const aUsar = Math.min(filaMonto, entradaRestante);
    
    console.log(`Fila ${fila.id} usa $${aUsar} de ${entrada.cuenta}`);
    
    filaMonto -= aUsar;
    entradaRestante -= aUsar;
    
    if (entradaRestante < 0.001) {
      entradaIdx++;
      if (entradaIdx < entradas.length) {
        entradaRestante = entradas[entradaIdx].monto;
      }
    }
  }
}
