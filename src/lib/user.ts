import { v4 as uuidv4 } from 'uuid';

export function getUserId(): string {
  let id = localStorage.getItem('auth_user_id');
  if (!id || id === 'null' || id === 'undefined') {
    id = uuidv4();
    localStorage.setItem('auth_user_id', id);
  }
  return id;
}
