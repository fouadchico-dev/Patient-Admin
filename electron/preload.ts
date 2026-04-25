import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
/*
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})
  */


contextBridge.exposeInMainWorld("api", {
  
  auth: {
    me: () => ipcRenderer.invoke("auth:me"),
    login: (username: string, password: string) =>
      ipcRenderer.invoke("auth:login", { username, password }),
    logout: () => ipcRenderer.invoke("auth:logout"),
  },

  users: {
    list: (q?: string) => ipcRenderer.invoke("users:list", { q }),
    create: (data: any) => ipcRenderer.invoke("users:create", { data }),
    update: (id: string, data: any) => ipcRenderer.invoke("users:update", { id, data }),
    remove: (id: string) => ipcRenderer.invoke("users:remove", { id }),
  },

  staff: {
    list: (q?: string) => ipcRenderer.invoke("staff:list", { q }),
    create: (data: any) => ipcRenderer.invoke("staff:create", { data }),
    update: (id: string, data: any) => ipcRenderer.invoke("staff:update", { id, data }),
    remove: (id: string) => ipcRenderer.invoke("staff:remove", { id }),
  },

  /*
  doctors: {
    list: (q?: string) => ipcRenderer.invoke("doctors:list", { q }),
    create: (data: any) => ipcRenderer.invoke("doctors:create", { data }),
    update: (id: string, data: any) => ipcRenderer.invoke("doctors:update", { id, data }),
    remove: (id: string) => ipcRenderer.invoke("doctors:remove", { id }),
  },
  */
  assistants: {
    list: (q?: string) => ipcRenderer.invoke("assistants:list", { q }),
    create: (data: any) => ipcRenderer.invoke("assistants:create", { data }),
    update: (id: string, data: any) => ipcRenderer.invoke("assistants:update", { id, data }),
    remove: (id: string) => ipcRenderer.invoke("assistants:remove", { id }),
  },
  managers: {
    list: (q?: string) => ipcRenderer.invoke("managers:list", { q }),
    create: (data: any) => ipcRenderer.invoke("managers:create", { data }),
    update: (id: string, data: any) => ipcRenderer.invoke("managers:update", { id, data }),
    remove: (id: string) => ipcRenderer.invoke("managers:remove", { id }),
  },
  projects: {
    list: (q?: string) => ipcRenderer.invoke("projects:list", { q }),
    get: (id: string) => ipcRenderer.invoke("projects:get", { id }),
    create: (data: any) => ipcRenderer.invoke("projects:create", { data }),
    update: (id: string, data: any) => ipcRenderer.invoke("projects:update", { id, data }),
    remove: (id: string) => ipcRenderer.invoke("projects:remove", { id }),
  },
  treatments: {
    listByProject: (projectId: string) => ipcRenderer.invoke("treatments:listByProject", { projectId }),
    add: (data: any) => ipcRenderer.invoke("treatments:add", { data }),
    update: (id: string, data: any) => ipcRenderer.invoke("treatments:update", { id, data }),
    remove: (id: string) => ipcRenderer.invoke("treatments:remove", { id }),
  },

  
 patients: {
    list: (q?: string) => ipcRenderer.invoke("patients:list", { q }),
    get: (id: string) => ipcRenderer.invoke("patients:get", { id }),
    create: (data: any) => ipcRenderer.invoke("patients:create", { data }),
    update: (id: string, data: any) => ipcRenderer.invoke("patients:update", { id, data }),
    remove: (id: string) => ipcRenderer.invoke("patients:remove", { id }),
  },

  patientDiagnoses: {
  listByPatient: (patientId: string) => ipcRenderer.invoke("patientDiagnoses:listByPatient", { patientId }),
  create: (data: any) => ipcRenderer.invoke("patientDiagnoses:create", { data }),
  update: (id: string, data: any) => ipcRenderer.invoke("patientDiagnoses:update", { id, data }),
  remove: (id: string) => ipcRenderer.invoke("patientDiagnoses:remove", { id }),
  },
  patientMedications: {
    listByPatient: (patientId: string) => ipcRenderer.invoke("patientMedications:listByPatient", { patientId }),
    create: (data: any) => ipcRenderer.invoke("patientMedications:create", { data }),
    update: (id: string, data: any) => ipcRenderer.invoke("patientMedications:update", { id, data }),
    remove: (id: string) => ipcRenderer.invoke("patientMedications:remove", { id }),
  },
  /*
  patientHistory: {
    listByPatient: (patientId: string) => ipcRenderer.invoke("patientHistory:listByPatient", { patientId }),
    create: (data: any) => ipcRenderer.invoke("patientHistory:create", { data }),
    update: (id: string, data: any) => ipcRenderer.invoke("patientHistory:update", { id, data }),
    remove: (id: string) => ipcRenderer.invoke("patientHistory:remove", { id }),
  },
  */



  patientNotes: {
    listByPatient: (patientId: string) => ipcRenderer.invoke("patientNotes:listByPatient", { patientId }),
    listByAppointment: (appointmentId: string) => ipcRenderer.invoke("patientNotes:listByAppointment", { appointmentId }),
    create: (data: any) => ipcRenderer.invoke("patientNotes:create", { data }),
    update: (id: string, data: any) => ipcRenderer.invoke("patientNotes:update", { id, data }),
    remove: (id: string) => ipcRenderer.invoke("patientNotes:remove", { id }),
  },

  patientContacts: {
    listByPatient: (patientId: string) => ipcRenderer.invoke("patientContacts:listByPatient", { patientId }),
    create: (data: any) => ipcRenderer.invoke("patientContacts:create", { data }),
    update: (id: string, data: any) => ipcRenderer.invoke("patientContacts:update", { id, data }),
    remove: (id: string) => ipcRenderer.invoke("patientContacts:remove", { id }),
  },

  patientFiles: {
    listByPatient: (patientId: string, filters?: any) => ipcRenderer.invoke("patientFiles:listByPatient", { patientId, filters: filters ?? {} }),
    pickAndUpload: (patientId: string, opts?: { caption?: string; category?: string; tags?: string }) =>
      ipcRenderer.invoke("patientFiles:pickAndUpload", {
        patientId,
        caption: opts?.caption ?? null,
        category: opts?.category ?? null,
        tags: opts?.tags ?? null,
      }),
    update: (id: string, data: any) => ipcRenderer.invoke("patientFiles:update", { id, data }),
    remove: (id: string) => ipcRenderer.invoke("patientFiles:remove", { id }),
    open: (id: string) => ipcRenderer.invoke("patientFiles:open", { id }),
    reveal: (id: string) => ipcRenderer.invoke("patientFiles:reveal", { id }),
    getThumbnail: (id: string) => ipcRenderer.invoke("patientFiles:getThumbnail", { id }),
  },


  patientTreatmentPlan: {
    listByPatient: (patientId: string) => ipcRenderer.invoke("patientTreatmentPlan:listByPatient", { patientId }),
    create: (data: any) => ipcRenderer.invoke("patientTreatmentPlan:create", { data }),
    update: (id: string, data: any) => ipcRenderer.invoke("patientTreatmentPlan:update", { id, data }),
    remove: (id: string) => ipcRenderer.invoke("patientTreatmentPlan:remove", { id }),
  },



  appointments: {
    range: (startISO: string, endISO: string, filters?: any) =>
      ipcRenderer.invoke("appointments:range", { startISO, endISO, filters }),
    create: (data: any) => ipcRenderer.invoke("appointments:create", { data }),
    update: (id: string, data: any) => ipcRenderer.invoke("appointments:update", { id, data }),
    remove: (id: string) => ipcRenderer.invoke("appointments:remove", { id }),
  }

});

