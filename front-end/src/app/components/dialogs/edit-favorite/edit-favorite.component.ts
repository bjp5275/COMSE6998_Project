import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { first } from 'rxjs';
import { FavoriteOrder } from 'src/app/model/models';
import { UserService } from 'src/app/shared/services/user.service';

@Component({
  selector: 'edit-favorite-dialog',
  templateUrl: './edit-favorite.component.html',
  styleUrls: ['./edit-favorite.component.scss'],
})
export class EditFavoriteDialog {
  favoriteForm;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditFavoriteDialog, string>,
    private userService: UserService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) private order: FavoriteOrder
  ) {
    this.favoriteForm = this.fb.group({
      name: this.fb.control(order.name, Validators.required),
    });
  }

  submitForm(): void {
    if (this.favoriteForm.valid) {
      const newName = this.favoriteForm.get('name')!.value!;
      const newOrder: FavoriteOrder = {
        ...this.order,
        name: newName,
      };

      this.userService
        .updateFavoriteOrder(this.order.id!, newOrder)
        .pipe(first())
        .subscribe((success) => {
          if (success) {
            this.dialogRef.close(newName);
          } else {
            this.snackBar.open(
              'Failed to save favorite. Please try again.',
              'OK'
            );
          }
        });
    }
  }
}
