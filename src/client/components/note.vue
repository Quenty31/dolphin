<template>
<div
	class="note _panel"
	v-show="appearNote.deletedAt == null && !hideThisNote"
	:tabindex="appearNote.deletedAt == null ? '-1' : null"
	:class="{ renote: isRenote }"
	v-hotkey="keymap"
>
	<x-sub v-for="note in conversation" :key="note.id" :note="note"/>
	<x-sub :note="appearNote.reply" class="reply-to" v-if="appearNote.reply"/>
	<div class="pinned" v-if="pinned"><fa :icon="faThumbtack"/> {{ $t('pinnedNote') }}</div>
	<div class="renote" v-if="isRenote">
		<dp-avatar class="avatar" :user="note.user"/>
		<fa :icon="faRetweet"/>
		<i18n path="renotedBy" tag="span">
			<router-link class="name" :to="note.user | userPage" v-user-preview="note.userId" place="user">
				<dp-user-name :user="note.user"/>
			</router-link>
		</i18n>
		<div class="info">
			<dp-time :time="note.createdAt"/>
			<span class="visibility" v-if="note.visibility != 'public'">
				<fa v-if="note.visibility == 'home'" :icon="faHome"/>
				<fa v-if="note.visibility == 'followers'" :icon="faUnlock"/>
				<fa v-if="note.visibility == 'specified'" :icon="faEnvelope"/>
			</span>
		</div>
	</div>
	<article class="article">
		<dp-avatar class="avatar" :user="appearNote.user"/>
		<div class="main">
			<x-note-header class="header" :note="appearNote" :mini="true"/>
			<div class="body" v-if="appearNote.deletedAt == null">
				<p v-if="appearNote.cw != null" class="cw">
				<mfm v-if="appearNote.cw != ''" class="text" :text="appearNote.cw" :author="appearNote.user" :i="$store.state.i" :custom-emojis="appearNote.emojis" />
					<x-cw-button v-model="showContent" :note="appearNote"/>
				</p>
				<div class="content" v-show="appearNote.cw == null || showContent">
					<div class="text">
						<span v-if="appearNote.isHidden" style="opacity: 0.5">({{ $t('private') }})</span>
						<mfm v-if="appearNote.text" :text="appearNote.text" :author="appearNote.user" :i="$store.state.i" :custom-emojis="appearNote.emojis"/>
						<a class="rp" v-if="appearNote.renote != null">RN:</a>
					</div>
					<div class="files" v-if="appearNote.files.length > 0">
						<x-media-list :media-list="appearNote.files"/>
					</div>
					<x-poll v-if="appearNote.poll" :note="appearNote" ref="pollViewer"/>
					<x-url-preview v-for="url in urls" :url="url" :key="url" :compact="true" class="url-preview"/>
					<div class="renote" v-if="appearNote.renote"><x-note-preview :note="appearNote.renote"/></div>
				</div>
			</div>
			<footer v-if="appearNote.deletedAt == null" class="footer">
				<x-reactions-viewer :note="appearNote" ref="reactionsViewer"/>
				<button @click="reply()" class="button _button">
					<template v-if="appearNote.reply"><fa :icon="faReplyAll"/></template>
					<template v-else><fa :icon="faReply"/></template>
					<p class="count" v-if="appearNote.repliesCount > 0">{{ appearNote.repliesCount }}</p>
				</button>
				<button v-if="['public', 'home'].includes(appearNote.visibility)" @click="renote()" class="button _button" ref="renoteButton">
					<fa :icon="faRetweet"/><p class="count" v-if="appearNote.renoteCount > 0">{{ appearNote.renoteCount }}</p>
				</button>
				<button v-else class="button _button">
					<fa :icon="faBan"/>
				</button>
				<button v-if="!isMyNote && appearNote.myReaction == null" class="button _button" @click="react()" ref="reactButton">
					<fa :icon="faPlus"/>
				</button>
				<button v-if="!isMyNote && appearNote.myReaction != null" class="button _button reacted" @click="undoReact(appearNote)" ref="reactButton">
					<fa :icon="faMinus"/>
				</button>
				<button class="button _button" @click="menu()" ref="menuButton">
					<fa :icon="faEllipsisH"/>
				</button>
			</footer>
			<div class="deleted" v-if="appearNote.deletedAt != null">{{ $t('deleted') }}</div>
		</div>
	</article>
	<x-sub v-for="note in replies" :key="note.id" :note="note"/>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { faPlus, faMinus, faRetweet, faReply, faReplyAll, faEllipsisH, faHome, faUnlock, faEnvelope, faThumbtack, faBan } from '@fortawesome/free-solid-svg-icons';
import { parse } from '../../mfm/parse';
import { sum, unique } from '../../prelude/array';
import i18n from '../i18n';
import XSub from './note.sub.vue';
import XNoteHeader from './note-header.vue';
import XNotePreview from './note-preview.vue';
import XReactionsViewer from './reactions-viewer.vue';
import XMediaList from './media-list.vue';
import XCwButton from './cw-button.vue';
import XPoll from './poll.vue';
import XUrlPreview from './url-preview.vue';
import DpNoteMenu from './note-menu.vue';
import DpReactionPicker from './reaction-picker.vue';
import DpRenotePicker from './renote-picker.vue';
import pleaseLogin from '../scripts/please-login';

function focus(el, fn) {
	const target = fn(el);
	if (target) {
		if (target.hasAttribute('tabindex')) {
			target.focus();
		} else {
			focus(target, fn);
		}
	}
}

export default Vue.extend({
	i18n,
	
	components: {
		XSub,
		XNoteHeader,
		XNotePreview,
		XReactionsViewer,
		XMediaList,
		XCwButton,
		XPoll,
		XUrlPreview,
	},

	props: {
		note: {
			type: Object,
			required: true
		},
		detail: {
			type: Boolean,
			required: false,
			default: false
		},
		pinned: {
			type: Boolean,
			required: false,
			default: false
		},
	},

	data() {
		return {
			connection: null,
			conversation: [],
			replies: [],
			showContent: false,
			hideThisNote: false,
			openingMenu: false,
			faPlus, faMinus, faRetweet, faReply, faReplyAll, faEllipsisH, faHome, faUnlock, faEnvelope, faThumbtack, faBan
		};
	},

	computed: {
		keymap(): any {
			return {
				'r': () => this.reply(true),
				'e|a|plus': () => this.react(true),
				'q': () => this.renote(true),
				'f|b': this.favorite,
				'delete|ctrl+d': this.del,
				'ctrl+q': this.renoteDirectly,
				'up|k|shift+tab': this.focusBefore,
				'down|j|tab': this.focusAfter,
				'esc': this.blur,
				'm|o': () => this.menu(true),
				's': this.toggleShowContent,
				'1': () => this.reactDirectly(this.$store.state.settings.reactions[0]),
				'2': () => this.reactDirectly(this.$store.state.settings.reactions[1]),
				'3': () => this.reactDirectly(this.$store.state.settings.reactions[2]),
				'4': () => this.reactDirectly(this.$store.state.settings.reactions[3]),
				'5': () => this.reactDirectly(this.$store.state.settings.reactions[4]),
				'6': () => this.reactDirectly(this.$store.state.settings.reactions[5]),
				'7': () => this.reactDirectly(this.$store.state.settings.reactions[6]),
				'8': () => this.reactDirectly(this.$store.state.settings.reactions[7]),
				'9': () => this.reactDirectly(this.$store.state.settings.reactions[8]),
				'0': () => this.reactDirectly(this.$store.state.settings.reactions[9]),
			};
		},

		isRenote(): boolean {
			return (this.note.renote &&
				this.note.text == null &&
				this.note.fileIds.length == 0 &&
				this.note.poll == null);
		},

		appearNote(): any {
			return this.isRenote ? this.note.renote : this.note;
		},

		isMyNote(): boolean {
			return this.$store.getters.isSignedIn && (this.$store.state.i.id === this.appearNote.userId);
		},

		reactionsCount(): number {
			return this.appearNote.reactions
				? sum(Object.values(this.appearNote.reactions))
				: 0;
		},

		title(): string {
			return '';
		},

		urls(): string[] {
			if (this.appearNote.text) {
				const ast = parse(this.appearNote.text);
				// TODO: 再帰的にURL要素がないか調べる
				const urls = unique(ast
					.filter(t => ((t.node.type == 'url' || t.node.type == 'link') && t.node.props.url && !t.node.props.silent))
					.map(t => t.node.props.url));

				// unique without hash
				// [ http://a/#1, http://a/#2, http://b/#3 ] => [ http://a/#1, http://b/#3 ]
				const removeHash = x => x.replace(/#[^#]*$/, '');

				return urls.reduce((array, url) => {
					const removed = removeHash(url);
					if (!array.map(x => removeHash(x)).includes(removed)) array.push(url);
					return array;
				}, []);
			} else {
				return null;
			}
		}
	},

	created() {
		if (this.$store.getters.isSignedIn) {
			this.connection = this.$root.stream;
		}

		if (this.detail) {
			this.$root.api('notes/children', {
				noteId: this.appearNote.id,
				limit: 30
			}).then(replies => {
				this.replies = replies;
			});

			if (this.appearNote.replyId) {
				this.$root.api('notes/conversation', {
					noteId: this.appearNote.replyId
				}).then(conversation => {
					this.conversation = conversation.reverse();
				});
			}
		}
	},

	mounted() {
		this.capture(true);

		if (this.$store.getters.isSignedIn) {
			this.connection.on('_connected_', this.onStreamConnected);
		}
	},

	beforeDestroy() {
		this.decapture(true);

		if (this.$store.getters.isSignedIn) {
			this.connection.off('_connected_', this.onStreamConnected);
		}
	},

	methods: {
		capture(withHandler = false) {
			if (this.$store.getters.isSignedIn) {
				const data = {
					id: this.appearNote.id
				} as any;

				if (
					(this.appearNote.visibleUserIds || []).includes(this.$store.state.i.id) ||
					(this.appearNote.mentions || []).includes(this.$store.state.i.id)
				) {
					data.read = true;
				}

				this.connection.send('sn', data);
				if (withHandler) this.connection.on('noteUpdated', this.onStreamNoteUpdated);
			}
		},

		decapture(withHandler = false) {
			if (this.$store.getters.isSignedIn) {
				this.connection.send('un', {
					id: this.appearNote.id
				});
				if (withHandler) this.connection.off('noteUpdated', this.onStreamNoteUpdated);
			}
		},

		onStreamConnected() {
			this.capture();
		},

		onStreamNoteUpdated(data) {
			const { type, id, body } = data;

			if (id !== this.appearNote.id) return;

			switch (type) {
				case 'reacted': {
					const reaction = body.reaction;

					if (this.appearNote.reactions == null) {
						Vue.set(this.appearNote, 'reactions', {});
					}

					if (this.appearNote.reactions[reaction] == null) {
						Vue.set(this.appearNote.reactions, reaction, 0);
					}

					// Increment the count
					this.appearNote.reactions[reaction]++;

					if (body.userId == this.$store.state.i.id) {
						Vue.set(this.appearNote, 'myReaction', reaction);
					}
					break;
				}

				case 'unreacted': {
					const reaction = body.reaction;

					if (this.appearNote.reactions == null) {
						return;
					}

					if (this.appearNote.reactions[reaction] == null) {
						return;
					}

					// Decrement the count
					if (this.appearNote.reactions[reaction] > 0) this.appearNote.reactions[reaction]--;

					if (body.userId == this.$store.state.i.id) {
						Vue.set(this.appearNote, 'myReaction', null);
					}
					break;
				}

				case 'pollVoted': {
					const choice = body.choice;
					this.appearNote.poll.choices[choice].votes++;
					if (body.userId == this.$store.state.i.id) {
						Vue.set(this.appearNote.poll.choices[choice], 'isVoted', true);
					}
					break;
				}

				case 'deleted': {
					Vue.set(this.appearNote, 'deletedAt', body.deletedAt);
					Vue.set(this.appearNote, 'renote', null);
					this.appearNote.text = null;
					this.appearNote.fileIds = [];
					this.appearNote.poll = null;
					this.appearNote.cw = null;
					break;
				}
			}
		},

		reply(viaKeyboard = false) {
			pleaseLogin(this.$root);
			this.$root.post({
				reply: this.appearNote,
				animation: !viaKeyboard,
			}, () => {
				this.focus();
			});
		},

		renote() {
			pleaseLogin(this.$root);
			this.blur();
			this.$root.new(DpRenotePicker, {
				source: this.$refs.renoteButton,
				note: this.appearNote,
			}).$once('closed', this.focus);
		},

		renoteDirectly() {
			(this as any).$root.api('notes/create', {
				renoteId: this.appearNote.id
			});
		},

		react(viaKeyboard = false) {
			pleaseLogin(this.$root);
			this.blur();
			const picker = this.$root.new(DpReactionPicker, {
				source: this.$refs.reactButton,
				showFocus: viaKeyboard,
			});
			picker.$once('chosen', reaction => {
				this.$root.api('notes/reactions/create', {
					noteId: this.appearNote.id,
					reaction: reaction
				}).then(() => {
					picker.close();
				});
			});
			picker.$once('closed', this.focus);
		},

		reactDirectly(reaction) {
			this.$root.api('notes/reactions/create', {
				noteId: this.appearNote.id,
				reaction: reaction
			});
		},

		undoReact(note) {
			const oldReaction = note.myReaction;
			if (!oldReaction) return;
			this.$root.api('notes/reactions/delete', {
				noteId: note.id
			});
		},

		favorite() {
			pleaseLogin(this.$root);
			this.$root.api('notes/favorites/create', {
				noteId: this.appearNote.id
			}).then(() => {
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			});
		},

		del() {
			this.$root.dialog({
				type: 'warning',
				text: this.$t('noteDeleteConfirm'),
				showCancelButton: true
			}).then(({ canceled }) => {
				if (canceled) return;

				this.$root.api('notes/delete', {
					noteId: this.appearNote.id
				});
			});
		},

		menu(viaKeyboard = false) {
			if (this.openingMenu) return;
			this.openingMenu = true;
			const w = this.$root.new(DpNoteMenu, {
				source: this.$refs.menuButton,
				note: this.appearNote,
				animation: !viaKeyboard
			}).$once('closed', () => {
				this.openingMenu = false;
				this.focus();
			});
		},

		toggleShowContent() {
			this.showContent = !this.showContent;
		},

		focus() {
			this.$el.focus();
		},

		blur() {
			this.$el.blur();
		},

		focusBefore() {
			focus(this.$el, e => e.previousElementSibling);
		},

		focusAfter() {
			focus(this.$el, e => e.nextElementSibling);
		}
	}
});
</script>

<style lang="scss" scoped>
@import '../theme';

.note {
	position: relative;
	font-size: 16px;
	transition: box-shadow 0.1s ease;

	@media (max-width: 500px) {
		font-size: 14px;
	}

	&:focus {
		outline: none;
		box-shadow: 0 0 0 3px rgba($primary, 0.3);
	}

	&:hover > .article > .main > .footer > .button {
		opacity: 1;
	}

	> *:first-child {
		border-radius: var(--radius) var(--radius) 0 0;
	}

	> *:last-child {
		border-radius: 0 0 var(--radius) var(--radius);
	}

	> .pinned {
		padding: 16px 32px 8px 32px;
		line-height: 24px;
		font-size: 90%;
		white-space: pre;
		color: #d28a3f;

		@media (max-width: 450px) {
			padding: 8px 16px 0 16px;
		}

		> [data-icon] {
			margin-right: 4px;
		}
	}

	> .pinned + .article {
		padding-top: 8px;
	}

	> .renote {
		display: flex;
		align-items: center;
		padding: 16px 32px 8px 32px;
		line-height: 28px;
		white-space: pre;
		color: #229e82;

		@media (max-width: 450px) {
			padding: 8px 16px 0 16px;
		}

		> .avatar {
			flex-shrink: 0;
			display: inline-block;
			width: 28px;
			height: 28px;
			margin: 0 8px 0 0;
			border-radius: 6px;
		}

		> [data-icon] {
			margin-right: 4px;
		}

		> span {
			overflow: hidden;
			flex-shrink: 1;
			text-overflow: ellipsis;
			white-space: nowrap;

			> .name {
				font-weight: bold;
			}
		}

		> .info {
			margin-left: auto;
			font-size: 0.9em;

			> .dp-time {
				flex-shrink: 0;
			}

			> .visibility {
				margin-left: 8px;

				[data-icon] {
					margin-right: 0;
				}
			}
		}
	}

	> .renote + .article {
		padding-top: 8px;
	}

	> .article {
		display: flex;
		padding: 28px 32px 18px;

		@media (max-width: 450px) {
			padding: 14px 16px 9px;
		}

		> .avatar {
			flex-shrink: 0;
			display: block;
			margin: 0 10px 8px 0;
			width: 58px;
			height: 58px;
			position: sticky;
			top: 16px;
			left: 0;

			@media (max-width: 450px) {
				width: 50px;
				height: 50px;
			}
		}

		> .main {
			flex: 1;
			min-width: 0;

			> .body {
				> .cw {
					cursor: default;
					display: block;
					margin: 0;
					padding: 0;
					overflow-wrap: break-word;

					> .text {
						margin-right: 8px;
					}
				}

				> .content {

					> .text {
						display: block;
						margin: 0;
						padding: 0;
						overflow-wrap: break-word;
						font-size: 1em;

						> .rp {
							margin-left: 4px;
							font-style: oblique;
							color: #229e82;
						}
					}

					> .url-preview {
						margin-top: 8px;
					}

					> .files {
						> img {
							display: block;
							max-width: 100%;
						}
					}

					> .dp-poll {
						font-size: 80%;
					}

					> .renote {
						padding: 8px 0;
					}
				}
			}

			> .footer {
				> .button {
					margin: 0;
					padding: 8px;
					opacity: 0.7;

					&:not(:last-child) {
						margin-right: 28px;
					}

					&:hover {
						color: darken(#5c6a73, 30%);

						@media (prefers-color-scheme: dark) {
							color: lighten(#c7d1d8, 30%);
						}
					}

					> .count {
						display: inline;
						margin: 0 0 0 8px;
						opacity: 0.7;
					}

					&.reacted {
						color: $primary;
					}
				}
			}

			> .deleted {
				opacity: 0.7;
			}
		}
	}
}
</style>
