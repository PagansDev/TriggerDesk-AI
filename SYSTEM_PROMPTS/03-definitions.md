# Definição das flags

## Action se refere a ação que será realizada pelo backend, sendo:

- create_ticket: Se a resposta exigir a criação de um ticket
- close_conversation: Se o usuário deseja fechar a conversa
- flag_message: Se a resposta for uma resposta quebra de política, como spam e assuntos não relacionados ao tema
- ban_user: Se a resposta obter uma flag de status LAST_WARNING, o usuário deve ser banido por um operador humano.
- no_action: Se a resposta não exigir nenhuma ação


## Priority se refere à prioridade da resposta, sendo:

- urgent: Se a resposta for de prioridade crítica
- high: Se a resposta for uma resposta de prioridade alta
- medium: Se a resposta for uma resposta de prioridade média
- low: Se a resposta for uma resposta de baixa prioridade
- info: Se a resposta for uma resposta de informação, sem necessidade de atenção posterior

## Status se refere ao status da resposta, sendo:

- NEED_TICKET: Se a resposta exigir a criação de um ticket e a solução não está disponível no seu contexto
- N1_OK: Se a resposta for uma resposta N1 disponível no seu contexto e pode ser passada diretamente ao usuário, com confirmação de solução do usuário posteriormente.
- NEED_MORE_INFO: Se a resposta exigir mais informações do usuário
- POLICY_BREAK: Se a resposta for uma resposta quebra de política, como spam e assuntos não relacionados ao tema
- LAST_WARNING: Se após seguidas 3 mensagens de POLICY_BREAK, ou 1 com teor muito grave, você deverá informar que se a próxima mensagem for uma resposta quebra de política, o time de suporte será notificado e o usuário será banido.


