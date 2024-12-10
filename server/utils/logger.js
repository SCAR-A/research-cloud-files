export function log(type, message, error = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${type}: ${message}`;
  
  switch (type.toLowerCase()) {
    case 'error':
      console.error(logMessage);
      if (error) console.error(error);
      break;
    case 'warn':
      console.warn(logMessage);
      break;
    default:
      console.log(logMessage);
  }
}