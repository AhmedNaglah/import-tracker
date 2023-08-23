import AssetstoreView from '@girder/core/views/body/AssetstoresView';
import FilesystemImportView from '@girder/core/views/body/FilesystemImportView';
import S3ImportView from '@girder/core/views/body/S3ImportView';

import { wrap } from '@girder/core/utilities/PluginUtils';
import events from '@girder/core/events';
import router from '@girder/core/router';

import importDataButton from './templates/assetstoreButtonsExtension.pug';
import importListView from './views/importList';
import reImportView from './views/reImport';
import excludeExistingInput from './templates/excludeExistingInput.pug';

// import modules for side effects
import './JobStatus';

// Inject button to navigate to imports page in each assetstore in view
wrap(AssetstoreView, 'render', function (render) {
    // Call the underlying render function that we are wrapping
    render.call(this);

    this.$el.find('.g-current-assetstores-container .g-body-title').after(
        '<a class="g-view-imports btn btn-sm btn-primary" href="#assetstore/all_imports"><i class="icon-link-ext"></i>View all past Imports</a>'
    );

    // Inject new button into each assetstore
    const assetstores = this.collection.toArray();
    this.$('.g-assetstore-import-button-container').after(
        (i) => importDataButton({ importsPageLink: `#assetstore/${assetstores[i].id}/imports` })
    );
});

// Add duplicate_files option to Import Asset form
wrap(FilesystemImportView, 'render', function (render) {
    render.call(this);

    this.$('.form-group').last().after(excludeExistingInput({ type: 'filesystem' }));
});
wrap(S3ImportView, 'render', function (render) {
    render.call(this);

    this.$('.form-group').last().after(excludeExistingInput({ type: 's3' }));
});

// We can't just wrap the submit events, as we need to modify what is passed to
// the assetstore import method
FilesystemImportView.prototype.events['submit .g-filesystem-import-form'] = function (e) {
    e.preventDefault();

    var destId = this.$('#g-filesystem-import-dest-id').val().trim().split(/\s/)[0],
        destType = this.$('#g-filesystem-import-dest-type').val(),
        foldersAsItems = this.$('#g-filesystem-import-leaf-items').val(),
        excludeExisting = this.$('#g-filesystem-import-exclude-existing').val();

    this.$('.g-validation-failed-message').empty();

    this.assetstore.off('g:imported').on('g:imported', function () {
        router.navigate(destType + '/' + destId, { trigger: true });
    }, this).on('g:error', function (resp) {
        this.$('.g-validation-failed-message').text(resp.responseJSON.message);
    }, this).import({
        importPath: this.$('#g-filesystem-import-path').val().trim(),
        leafFoldersAsItems: foldersAsItems,
        destinationId: destId,
        destinationType: destType,
        excludeExisting: excludeExisting,
        progress: true
    });
};
S3ImportView.prototype.events['submit .g-s3-import-form'] = function (e) {
    e.preventDefault();

    var destId = this.$('#g-s3-import-dest-id').val().trim().split(/\s/)[0],
        destType = this.$('#g-s3-import-dest-type').val(),
        excludeExisting = this.$('#g-s3-import-exclude-existing').val();

    this.$('.g-validation-failed-message').empty();

    this.assetstore.off('g:imported').on('g:imported', function () {
        router.navigate(destType + '/' + destId, { trigger: true });
    }, this).on('g:error', function (resp) {
        this.$('.g-validation-failed-message').text(resp.responseJSON.message);
    }, this).import({
        importPath: this.$('#g-s3-import-path').val().trim(),
        destinationId: destId,
        destinationType: destType,
        excludeExisting: excludeExisting,
        progress: true
    });
};

// Setup router to assetstore imports view
router.route('assetstore/:id/imports', 'importsPage', function (id) {
    events.trigger('g:navigateTo', importListView, { id });
});
router.route('assetstore/:id/unique_imports', 'importsPage', function (id) {
    events.trigger('g:navigateTo', importListView, { id, unique: true });
});
router.route('assetstore/all_imports', 'importsPage', function () {
    events.trigger('g:navigateTo', importListView);
});
router.route('assetstore/all_unique_imports', 'importsPage', function () {
    events.trigger('g:navigateTo', importListView, { unique: true });
});

// Setup router for re-import view
router.route('assetstore/:id/re-import/:prev', 'assetstoreImport', function (assetstoreId, importId) {
    events.trigger('g:navigateTo', reImportView, { assetstoreId, importId });
    AssetstoreView.import(assetstoreId);
});
