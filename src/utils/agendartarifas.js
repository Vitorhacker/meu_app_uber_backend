// src/utils/agendartarifas.js

// 🔹 Base de tarifas gerais (ajustáveis)
const tarifaBasePorKm = 1.9; // valor médio base por km
const tarifaMinima = 15; // valor mínimo de corrida

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

  // valor base do trajeto
  const valorPorKm = parseFloat(tarifaBasePorKm.toFixed(2));
  const valorTotal = Math.max(tarifaMinima, parseFloat((distanciaKm * valorPorKm).toFixed(2)));

  return {
    origemEndereco,
    destinoEndereco,
    distanciaKm,
    valorPorKm,
    valorMinimo: tarifaMinima,
    valorTotal,
    tipo: "dinâmico",
  };
}

/**
 * Lista apenas as tarifas base de referência
 */
function listarTarifas() {
  return [
    {
      descricao: "Tarifa base por km",
      valor: tarifaBasePorKm,
    },
    {
      descricao: "Tarifa mínima",
      valor: tarifaMinima,
    },
  ];
}

module.exports = {
  calcularTarifa,
  listarTarifas,
};
