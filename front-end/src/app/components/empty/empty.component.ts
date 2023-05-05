import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserRole } from 'src/app/model/models';
import { UserService } from 'src/app/shared/services/user.service';

@Component({
  selector: 'app-empty',
  templateUrl: './empty.component.html',
  styleUrls: ['./empty.component.scss'],
})
export class EmptyComponent implements OnInit {
  constructor(private userService: UserService, private router: Router) {}

  userHasRole(role: UserRole): boolean {
    const userInformation = this.userService.getCurrentUserInformation();
    return (
      (userInformation &&
        userInformation.roles &&
        userInformation.roles.includes(role)) ||
      false
    );
  }

  ngOnInit(): void {
    if (
      this.userHasRole(UserRole.ADMIN) ||
      this.userHasRole(UserRole.REGULAR_USER)
    ) {
      this.router.navigateByUrl('/products');
    } else if (this.userHasRole(UserRole.DELIVERER)) {
      this.router.navigateByUrl('/delivery/available');
    } else if (this.userHasRole(UserRole.SHOP_OWNER)) {
      this.router.navigateByUrl('/pending/available');
    }
  }
}
