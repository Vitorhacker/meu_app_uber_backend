// src/utils/tarifas.js

/**
 * Tarifas base por categoria de veículo (R$/km)
 */
const tarifas = {
  FlashHatch: 2.0,    // Hatch pequeno
  FlashPlus: 3.5,     // Sedan
  FlashPremium: 5.0,  // SUV / Premium
};

/**
 * Valor mínimo por corrida
 */
const VALOR_MINIMO = {
  FlashHatch: 5.5,
  FlashPlus: 8.0,
  FlashPremium: 14.0,
};

/**
 * Multiplicadores de horário de pico por categoria
 */
const MULTIPLICADOR_PICO = {
  FlashHatch: 1.2,
  FlashPlus: 1.25,
  FlashPremium: 1.35,
};

/**
 * Multiplicador noturno (22h - 5h)
 */
const MULTIPLICADOR_NOITE = 1.15;

/**
 * Verifica se está no horário de pico
 * @param {Date} date - hora atual ou passada
 * @returns {boolean}
 */
function isHorarioPico(date = new Date()) {
  const hour = date.getHours();
  const diaSemana = date.getDay(); // 0 = domingo, 6 = sábado
  const diaUtil = diaSemana >= 1 && diaSemana <= 5;

  const picoManha = hour >= 7 && hour <= 9;
  const picoTarde = hour >= 17 && hour <= 19;

  return diaUtil && (picoManha || picoTarde);
}

/**
 * Verifica se está no horário noturno
 * @param {Date} date
 * @returns {boolean}
 */
function isHorarioNoturno(date = new Date()) {
  const hour = date.getHours();
  return hour >= 22 || hour < 5;
}

/**
 * Calcula o valor estimado de uma corrida
 * @param {string} categoria - FlashHatch | FlashPlus | FlashPremium
 * @param {number} distancia - km
 * @param {number} duracao - minutos
 * @param {number} stops - número de paradas
 * @param {Date} date - hora opcional
 * @returns {number}
 */
function calcularValor(categoria, distancia, duracao, stops = 0, date = new Date()) {
  const tarifaBase = tarifas[categoria] || tarifas['FlashHatch'];
  let valor = tarifaBase * distancia + 0.5 * duracao; // R$0,50 por minuto

  // Adicional por paradas
  valor += stops * 2; // R$2 por parada

  // Horário de pico
  if (isHorarioPico(date)) {
    valor *= MULTIPLICADOR_PICO[categoria] || 1.25;
  }

  // Horário noturno
  if (isHorarioNoturno(date)) {
    valor *= MULTIPLICADOR_NOITE;
  }

  // Garantir valor mínimo por categoria
  valor = Math.max(valor, VALOR_MINIMO[categoria] || 10);

  return parseFloat(valor.toFixed(2));
}

/**
 * Calcula divisão entre motorista e plataforma
 * @param {number} valorFinal
 * @returns {Object} { valorMotorista, valorPlataforma }
 */
function calcularDivisao(valorFinal) {
  const valorMotorista = parseFloat((valorFinal * 0.8).toFixed(2)); // 80%
  const valorPlataforma = parseFloat((valorFinal * 0.2).toFixed(2)); // 20%
  return { valorMotorista, valorPlataforma };
}

module.exports = {
  tarifas,
  VALOR_MINIMO,
  isHorarioPico,
  isHorarioNoturno,
  calcularValor,
  calcularDivisao,
};
