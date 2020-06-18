/*!
 * @license
 * Copyright 2019 Alfresco Software, Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Directive, HostListener, Output, EventEmitter, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { IdentityUserService } from '@alfresco/adf-core';
import { ProcessCloudService } from '../services/process-cloud.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ProcessInstanceCloud } from '../start-process/models/process-instance-cloud.model';

@Directive({
    selector: '[adf-cloud-cancel-process]'
})
export class CancelProcessDirective implements OnInit, OnDestroy {

    /** Emitted when the process is cancelled. */
    @Output()
    success: EventEmitter<any> = new EventEmitter<any>();

    /** Emitted when the process cannot be cancelled. */
    @Output()
    error: EventEmitter<any> = new EventEmitter<any>();

    processInstanceDetails: ProcessInstanceCloud;

    canCancelProcess = false;

    private onDestroy$ = new Subject<boolean>();

    constructor(
        private elementRef: ElementRef,
        private processCloudService: ProcessCloudService,
        private identityUserService: IdentityUserService) {}

    ngOnInit() {
        this.processCloudService.dataChangesDetected
            .pipe(takeUntil(this.onDestroy$))
            .subscribe((processDetails: ProcessInstanceCloud) => {
                this.processInstanceDetails = processDetails;
                this.canCancelProcess = this.checkCanCancelProcess();
                this.setElementVisibility();
            });
    }

    @HostListener('click')
    async onClick() {
        try {
            await this.cancelProcess();
        } catch (error) {
            this.error.emit(error);
        }
    }

    private setElementVisibility() {
        this.elementRef.nativeElement.disabled = !this.canCancelProcess;
    }

    checkCanCancelProcess(): boolean {
        const currentUser = this.identityUserService.getCurrentUserInfo().username;
        return  this.processInstanceDetails.initiator === currentUser && this.processInstanceDetails.status === 'RUNNING';
    }

    async cancelProcess() {
        if (this.canCancelProcess) {
            await this.processCloudService.cancelProcess(this.processInstanceDetails.appName, this.processInstanceDetails.id)
                .pipe(takeUntil(this.onDestroy$))
                .subscribe((response) => {
                    this.success.emit(response);
                }, ((error) => {
                    this.error.emit(error);
                }));
        } else {
            this.error.emit('Permission denied, only process initiator can cancel the process');
        }
    }

    ngOnDestroy() {
        this.onDestroy$.next(true);
        this.onDestroy$.complete();
    }
}
