// src/utils/agendartarifas.js

// 🔹 Base de tarifas gerais (ajustáveis)
const tarifaMinima = 15; // valor mínimo de corrida
const tarifaCurtaKm = 2.78; // até 50 km
const tarifaLongaKm = 1.98; // acima de 50 km

/**
 * Calcula tarifa com base apenas na distância
 * @param {object} params
 * @param {string} params.origemEndereco - endereço completo origem
 * @param {string} params.destinoEndereco - endereço completo destino
 * @param {number} params.distanciaKm - distância real entre os pontos
 */
function calcularTarifa({ origemEndereco, destinoEndereco, distanciaKm }) {
  if (!distanciaKm || distanciaKm <= 0) {
    throw new Error("Distância inválida para cálculo de tarifa");
  }

  // escolhe tarifa por km dependendo da distância
  const valorPorKm = distanciaKm <= 50 ? tarifaCurtaKm : tarifaLongaKm;

  const valorTotal = Math.max(
    tarifaMinima,
    parseFloat((distanciaKm * valorPorKm).toFixed(2))
  );

  return {
    origemEndereco,
    destinoEndereco,
    distanciaKm,
    valorPorKm,
    valorMinimo: tarifaMinima,
    valorTotal,
    tipo: distanciaKm <= 50 ? "curta" : "longa",
  };
}

/**
 * Lista apenas as tarifas base de referência
 */
function listarTarifas() {
  return [
    {
      descricao: "Tarifa mínima",
      valor: tarifaMinima,
    },
    {
      descricao: "Tarifa por km (até 50 km)",
      valor: tarifaCurtaKm,
    },
    {
      descricao: "Tarifa por km (acima de 50 km)",
      valor: tarifaLongaKm,
    },
  ];
}

module.exports = {
  calcularTarifa,
  listarTarifas,
};
