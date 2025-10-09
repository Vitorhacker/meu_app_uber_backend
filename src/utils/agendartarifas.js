// src/utils/agendartarifas.js

// Base de tarifas fixas (pode futuramente vir do banco de dados)
const tarifasBase = [
  { origem: "São Paulo", destino: "Praia Grande", distanciaBaseKm: 80, valorMinimo: 150 },
  { origem: "São Paulo", destino: "Campinas", distanciaBaseKm: 92, valorMinimo: 140 },
  { origem: "São Paulo", destino: "Mongaguá/Itanhaém", distanciaBaseKm: 110, valorMinimo: 165 },
];

// 🔹 Função auxiliar para remover acentos e normalizar strings
function normalizarTexto(txt) {
  return txt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Lista todas as tarifas base já com valorPorKm e valorTotal
 */
function listarTarifas() {
  return tarifasBase.map((t) => {
    const valorPorKm = parseFloat((t.valorMinimo / t.distanciaBaseKm).toFixed(2));
    return {
      ...t,
      valorPorKm,
      valorTotal: t.valorMinimo,
      valorExtraKm: 0, // ainda não há km extra
    };
  });
}

/**
 * Calcula tarifa com base na distância fornecida
 * @param {object} params
 * @param {string} params.origem
 * @param {string} params.destino
 * @param {number} params.distanciaKm
 */
function calcularTarifa({ origem, destino, distanciaKm }) {
  const origemNorm = normalizarTexto(origem);
  const destinoNorm = normalizarTexto(destino);

  const rota = tarifasBase.find(
    (t) =>
      normalizarTexto(t.origem) === origemNorm &&
      normalizarTexto(t.destino) === destinoNorm
  );

  if (rota) {
    const valorPorKm = parseFloat((rota.valorMinimo / rota.distanciaBaseKm).toFixed(2));
    const kmExtra = Math.max(distanciaKm - rota.distanciaBaseKm, 0);
    const valorExtraKm = parseFloat((kmExtra * valorPorKm).toFixed(2));
    const valorTotal = parseFloat((rota.valorMinimo + valorExtraKm).toFixed(2));

    return {
      ...rota,
      distanciaKm,
      valorPorKm,
      valorExtraKm,
      valorTotal,
      tipo: "rota-base",
    };
  }

  // Se não encontrou rota base, usa média geral
  const mediaPorKm =
    tarifasBase.reduce((acc, t) => acc + t.valorMinimo / t.distanciaBaseKm, 0) /
    tarifasBase.length;
  const valorTotal = parseFloat((distanciaKm * mediaPorKm).toFixed(2));

  return {
    origem,
    destino,
    distanciaKm,
    valorMinimo: 0,
    valorPorKm: parseFloat(mediaPorKm.toFixed(2)),
    valorExtraKm: 0,
    valorTotal,
    tipo: "média-base",
  };
}

module.exports = {
  listarTarifas,
  calcularTarifa,
};
