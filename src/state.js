let sharedEntities = [];

const setEntities = (entities) => {
  if (!Array.isArray(entities)) {
    console.error('State: setEntities received non-array:', entities);
    sharedEntities = [];
    return;
  }
  sharedEntities = [...entities]; // Defensive copy
  window.electronAPI.ipcRenderer.send('log', `State: Entities set, count: ${sharedEntities.length}`);
};

const getEntities = () => {
  if (!Array.isArray(sharedEntities)) {
    console.error('State: sharedEntities corrupted:', sharedEntities);
    sharedEntities = []; // Reset to safe default
  }
  return [...sharedEntities]; // Defensive copy
};

export { setEntities, getEntities };