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
import {MatTableModule} from '@angular/material/table';

export const COMMON_MATERIAL_IMPORTS = [
  MatButtonModule,
  MatIconModule,
  MatFormFieldModule,
  MatInputModule,
  MatCardModule,
  MatSnackBarModule,
  MatDialogModule,
  MatProgressSpinnerModule,
  MatTableModule
] as const;

export const FORM_MATERIAL_IMPORTS = [
  MatFormFieldModule,
  MatInputModule,
  MatSelectModule,
  MatSliderModule
] as const;