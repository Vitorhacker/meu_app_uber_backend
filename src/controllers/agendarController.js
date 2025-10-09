// src/controllers/agendarController.js
const db = require("../db"); // seu cliente/ORM de banco de dados
const { calcularTarifa, listarTarifas } = require("../utils/agendartarifas");

/**
 * Cria um agendamento de viagem
 */
async function criarAgendamento(req, res) {
  try {
    const {
      origemCidade,
      origemEndereco,
      destinoCidade,
      destinoEndereco,
      quando,
      passageiros,
      tarifaOpcional,
      distanciaKm,
      formaPagamento, // ✅ adicionado
    } = req.body;

    if (!origemCidade || !destinoCidade || !quando || !passageiros) {
      return res.status(400).json({
        success: false,
        message: "Campos obrigatórios não preenchidos",
      });
    }

    // 🔹 Calcula tarifa
    const tarifaCalculada = calcularTarifa({
      origem: origemEndereco,
      destino: destinoEndereco,
      distanciaKm: distanciaKm || 0, // se não passar, pode calcular via API de mapas depois
    });

    // 🔹 Inserir no banco de dados tabela `agendar`
    const result = await db.query(
      `INSERT INTO agendar 
      (origem_cidade, origem_endereco, destino_cidade, destino_endereco, quando, passageiros, tarifa_sugerida, valor_estimado, forma_pagamento, status) 
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        origemCidade,
        origemEndereco,
        destinoCidade,
        destinoEndereco,
        quando,
        passageiros,
        tarifaOpcional || null,
        tarifaCalculada.valorTotal,
        formaPagamento || null, // ✅ aqui
        "pendente", // status inicial
      ]
    );

    const agendaCriada = result.rows[0];

    return res.json({
      success: true,
      message: "Agendamento criado com sucesso",
      agenda: agendaCriada,
      tarifaCalculada,
    });
  } catch (err) {
    console.error("❌ Erro ao criar agendamento:", err);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao criar agendamento",
    });
  }
}

/**
 * Lista todas as viagens agendadas disponíveis
 */
async function listarAgendamentos(req, res) {
  try {
    const result = await db.query(
      `SELECT * FROM agendar WHERE status = 'pendente' ORDER BY quando ASC`
    );
    return res.json({
      success: true,
      agendamentos: result.rows,
    });
  } catch (err) {
    console.error("❌ Erro ao listar agendamentos:", err);
    return res.status(500).json({
      success: false,
      message: "Erro ao listar agendamentos",
    });
  }
}

/**
 * Passageiro cancela agendamento antes de ser aceito pelo motorista
 */
async function cancelarAgendamento(req, res) {
  try {
    const { agendaId } = req.body;

    if (!agendaId) {
      return res.status(400).json({
        success: false,
        message: "agendaId é obrigatório para cancelar a viagem",
      });
    }

    // Atualiza o status do agendamento para "cancelada"
    const result = await db.query(
      `UPDATE agendar SET status='cancelada' WHERE agenda_id=$1 AND status='pendente' RETURNING *`,
      [agendaId]
    );

    const agendamentoCancelado = result.rows[0];

    if (!agendamentoCancelado) {
      return res.status(404).json({
        success: false,
        message: "Agendamento não encontrado ou já confirmado/cancelado",
      });
    }

    return res.json({
      success: true,
      message: "Agendamento cancelado com sucesso",
      agendamento: agendamentoCancelado,
    });
  } catch (err) {
    console.error("❌ Erro ao cancelar agendamento:", err);
    return res.status(500).json({
      success: false,
      message: "Erro ao cancelar agendamento",
    });
  }
}

/**
 * Motorista aceita viagem agendada
 */
async function aceitarAgendamento(req, res) {
  try {
    const { agendaId, motoristaId } = req.body;

    if (!agendaId || !motoristaId) {
      return res.status(400).json({
        success: false,
        message: "agendaId e motoristaId são obrigatórios",
      });
    }

    // Atualiza o agendamento
    const result = await db.query(
      `UPDATE agendar SET status='confirmada', motorista_id=$1 WHERE agenda_id=$2 RETURNING *`,
      [motoristaId, agendaId]
    );

    const agendamentoAtualizado = result.rows[0];

    return res.json({
      success: true,
      message: "Agendamento aceito com sucesso",
      agendamento: agendamentoAtualizado,
    });
  } catch (err) {
    console.error("❌ Erro ao aceitar agendamento:", err);
    return res.status(500).json({
      success: false,
      message: "Erro ao aceitar agendamento",
    });
  }
}

module.exports = {
  criarAgendamento,
  listarAgendamentos,
  cancelarAgendamento, // ✅ adicionada
  aceitarAgendamento,
};
