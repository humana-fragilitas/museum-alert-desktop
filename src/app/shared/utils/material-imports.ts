import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatDialogModule } from "@angular/material/dialog";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { MatSliderModule } from "@angular/material/slider";
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from "@angular/material/chips";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatStepperModule } from "@angular/material/stepper";

export const COMMON_MATERIAL_IMPORTS = [
  MatButtonModule,
  MatIconModule,
  MatCardModule,
  MatSnackBarModule,
  MatDialogModule,
  MatProgressSpinnerModule,
  MatTableModule,
  MatChipsModule,
  MatExpansionModule,
  MatStepperModule
] as const;

export const FORM_MATERIAL_IMPORTS = [
  MatFormFieldModule,
  MatInputModule,
  MatSelectModule,
  MatSliderModule
] as const;