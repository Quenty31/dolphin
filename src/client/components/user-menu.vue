<template>
<x-menu :source="source" :items="items" @closed="$emit('closed')"/>
</template>

<script lang="ts">
import Vue from 'vue';
import { faAt, faListUl, faEye, faEyeSlash, faBan, faExternalLinkSquareAlt, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { faSnowflake, faEnvelope } from '@fortawesome/free-regular-svg-icons';
import i18n from '../i18n';
import XMenu from './menu.vue';
import copyToClipboard from '../scripts/copy-to-clipboard';
import { host } from '../config';

export default Vue.extend({
	i18n,

	components: {
		XMenu
	},

	props: ['user', 'source'],

	data() {
		let menu = [{
			icon: faAt,
			text: this.$t('copyUsername'),
			action: () => {
				copyToClipboard(`@${this.user.username}@${this.user.host || host}`);
			}
		}, {
			icon: faEnvelope,
			text: this.$t('sendMessage'),
			action: () => {
				this.$root.post({ specified: this.user });
			}
		}, this.user.host !== null ? {
			icon: faExternalLinkSquareAlt,
			text: this.$t('showOnRemote'),
			action: () => {
				window.open(this.user.url, '_blank');
			}
		} : undefined, null, {
			icon: faListUl,
			text: this.$t('addToList'),
			action: this.pushList
		}] as any;

		if (this.$store.getters.isSignedIn && this.$store.state.i.id != this.user.id) {
			menu = menu.concat([null, {
				icon: this.user.isMuted ? faEye : faEyeSlash,
				text: this.user.isMuted ? this.$t('unmute') : this.$t('mute'),
				action: this.toggleMute
			}, {
				icon: faBan,
				text: this.user.isBlocking ? this.$t('unblock') : this.$t('block'),
				action: this.toggleBlock
			}]);

			if (this.$store.state.i.isAdmin) {
				menu = menu.concat([null, {
					icon: faSnowflake,
					text: this.user.isSuspended ? this.$t('unsuspend') : this.$t('suspend'),
					action: this.toggleSuspend
				}]);
			}
		}

		if (this.$store.getters.isSignedIn && this.$store.state.i.id === this.user.id) {
			menu = menu.concat([null, {
				icon: faPencilAlt,
				text: this.$t('editProfile'),
				action: () => {
					this.$router.push('/settings');
				}
			}]);
		}

		return {
			items: menu
		};
	},

	methods: {
		async pushList() {
			const t = this.$t('selectList'); // なぜか後で参照すると null になるので最初にメモリに確保しておく
			const lists = await this.$root.api('users/lists/list');
			if (lists.length === 0) {
				this.$root.dialog({
					type: 'error',
					text: this.$t('youHaveNoLists')
				});
				return;
			}
			const { canceled, result: listId } = await this.$root.dialog({
				type: null,
				title: t,
				select: {
					items: lists.map(list => ({
						value: list.id, text: list.name
					}))
				},
				showCancelButton: true
			});
			if (canceled) return;
			this.$root.api('users/lists/push', {
				listId: listId,
				userId: this.user.id
			}).then(() => {
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			}).catch(e => {
				this.$root.dialog({
					type: 'error',
					text: e
				});
			});
		},

		async toggleMute() {
			this.$root.api(this.user.isMuted ? 'muting/delete' : 'muting/create', {
				userId: this.user.id
			}).then(() => {
				this.user.isMuted = !this.user.isMuted;
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			}, e => {
				this.$root.dialog({
					type: 'error',
					text: e
				});
			});
		},

		async toggleBlock() {
			if (!await this.getConfirmed(this.user.isBlocking ? this.$t('unblockConfirm') : this.$t('blockConfirm'))) return;

			this.$root.api(this.user.isBlocking ? 'blocking/delete' : 'blocking/create', {
				userId: this.user.id
			}).then(() => {
				this.user.isBlocking = !this.user.isBlocking;
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			}, e => {
				this.$root.dialog({
					type: 'error',
					text: e
				});
			});
		},

		async toggleSuspend() {
			if (!await this.getConfirmed(this.$t(this.user.isSuspended ? 'unsuspendConfirm' : 'suspendConfirm'))) return;

			this.$root.api(this.user.isSuspended ? 'admin/unsuspend-user' : 'admin/suspend-user', {
				userId: this.user.id
			}).then(() => {
				this.user.isSuspended = !this.user.isSuspended;
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			}, e => {
				this.$root.dialog({
					type: 'error',
					text: e
				});
			});
		},

		async getConfirmed(text: string): Promise<Boolean> {
			const confirm = await this.$root.dialog({
				type: 'warning',
				showCancelButton: true,
				title: 'confirm',
				text,
			});

			return !confirm.canceled;
		},
	}
});
</script>
