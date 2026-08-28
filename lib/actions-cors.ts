import { ACTION_CORS_HEADERS, actionJson, actionOptions } from "./solana-actions";

export { ACTION_CORS_HEADERS, ACTION_CORS_HEADERS as ACTIONS_CORS_HEADERS };

export function optionsResponse() {
  return actionOptions();
}

export function actionError(message: string, status = 400) {
  return actionJson({ message }, status);
}
