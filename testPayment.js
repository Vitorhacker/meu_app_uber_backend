[
  {
    "id": "1a2b3c4d-0000-1111-2222-abcdef123456",
    "request": {
      "method": "POST",
      "headers": {
        "authorization": "Bearer 0bd747e4-79e3-4257-b832-057200a810b38f694ca84560ab802a24c",
        "content-type": "application/json"
      },
      "params": {},
      "body": {
        "order_id": "teste_order_1001",
        "amount": 100,
        "customer": {
          "name": "Vitor Silva",
          "email": "vitor.silva1261.vs3@gmail.com",
          "tax_id": "00000000000"
        },
        "payment_method": {
          "type": "credit_card",
          "card": {
            "number": "4539620659922097",
            "expiration_month": "12",
            "expiration_year": "2030",
            "cvv": "123",
            "holder_name": "Vitor Silva"
          }
        },
        "return_url": "https://brilliant-motivation-production.up.railway.app/app/checkout-return",
        "callback_url": "https://brilliant-motivation-production.up.railway.app/api/webhooks/pagbank"
      }
    },
    "response": {
      "headers": {
        "content-length": "200",
        "Date": "2025-10-04T19:07:42.533Z",
        "Content-Type": "application/json"
      },
      "body": {
        "id": "transacao_1001",
        "status": "approved",
        "amount": 100,
        "payment_method": "credit_card",
        "customer": {
          "name": "Vitor Silva",
          "email": "vitor.silva1261.vs3@gmail.com"
        }
      },
      "status-code": 201
    },
    "created": "2025-10-04T16:07:42.533-03:00"
  },
  {
    "id": "2b3c4d5e-1111-2222-3333-abcdef654321",
    "request": {
      "method": "POST",
      "headers": {
        "authorization": "Bearer 0bd747e4-79e3-4257-b832-057200a810b38f694ca84560ab802a24c",
        "content-type": "application/json"
      },
      "params": {},
      "body": {
        "reference_id": "teste_order_1002",
        "customer": {
          "name": "Vitor Silva",
          "email": "vitor.silva1261.vs3@gmail.com",
          "tax_id": "00000000000"
        },
        "items": [
          {
            "reference_id": "item1",
            "name": "Crédito Teste",
            "quantity": 1,
            "unit_amount": 100
          }
        ],
        "charges": [
          {
            "reference_id": "charge1",
            "description": "Cobrança teste",
            "amount": {
              "value": 100,
              "currency": "BRL"
            },
            "payment_method": {
              "type": "CREDIT_CARD",
              "installments": 1,
              "capture": true,
              "card": {
                "number": "4539620659922097",
                "holder_name": "Vitor Silva",
                "exp_month": "12",
                "exp_year": "2030",
                "cvv": "123"
              }
            }
          }
        ],
        "notification_urls": [
          "https://brilliant-motivation-production.up.railway.app/api/webhooks/pagbank"
        ]
      }
    },
    "response": {
      "headers": {
        "content-length": "220",
        "Date": "2025-10-04T19:05:29.549Z",
        "Content-Type": "application/json"
      },
      "body": {
        "id": "transacao_1002",
        "status": "approved",
        "amount": 100,
        "customer": {
          "name": "Vitor Silva",
          "email": "vitor.silva1261.vs3@gmail.com"
        },
        "charges": [
          {
            "reference_id": "charge1",
            "status": "approved",
            "amount": 100
          }
        ]
      },
      "status-code": 201
    },
    "created": "2025-10-04T16:05:29.549-03:00"
  }
]
