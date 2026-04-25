import { registerAuthIpc } from "./auth";
//import { registerDoctorsIpc } from "./doctors";
import { registerPatientsIpc } from "./patients";
import { registerProjectsIpc } from "./projects";
import { registerTreatmentsIpc } from "./treatments";
import { registerAppointmentsIpc } from "./appointments";
//import { registerAssistantsIpc } from "./assistants";
import { registerManagersIpc } from "./managers";
import { registerStaffIpc } from "./staff";
import { registerUsersIpc } from "./users";
import { registerPatientDiagnosesIpc } from "./patientDiagnoses";
import { registerPatientMedicationsIpc } from "./patientMedications";
//import { registerPatientHistoryIpc } from "./patientHistory";
import { registerPatientContactsIpc } from "./patientContacts";
import { registerPatientFilesIpc } from "./patientFiles";
import { registerPatientTreatmentPlanIpc } from "./patientTreatmentPlan";
import { registerPatientNotesIpc } from "./patientNotes";


export function registerAllIpc() {
  registerAuthIpc();

  registerUsersIpc();

  //registerDoctorsIpc();
  registerStaffIpc();
  //registerAssistantsIpc();
  registerManagersIpc();

  registerPatientsIpc();
  registerPatientDiagnosesIpc();
  registerPatientMedicationsIpc();
  //registerPatientHistoryIpc();
  registerPatientContactsIpc();
  registerPatientFilesIpc();
  registerPatientTreatmentPlanIpc();
  registerPatientNotesIpc();

   

  registerProjectsIpc();
  registerTreatmentsIpc();
  registerAppointmentsIpc();


}