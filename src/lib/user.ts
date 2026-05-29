import { v4 as uuidv4 } from 'uuid';

export function getUserId(): string {
  let uid = localStorage.getItem('device_user_id');
  if (!uid) {
    uid = uuidv4();
    localStorage.setItem('device_user_id', uid);
  }
  return uid;
}
