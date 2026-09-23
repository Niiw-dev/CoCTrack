<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('clan_snapshots', function(Blueprint $t){
            $t->id(); $t->string('clan_tag'); $t->string('clan_name')->nullable();
            $t->integer('clan_level')->default(0); $t->integer('members_count')->default(0);
            $t->json('raw_json')->nullable(); $t->timestampTz('synced_at');
            $t->timestampsTz(); $t->index('clan_tag'); $t->index('synced_at');
        });
        Schema::create('member_snapshots', function(Blueprint $t){
            $t->id(); $t->foreignId('clan_snapshot_id')->constrained('clan_snapshots')->cascadeOnDelete();
            $t->string('player_tag'); $t->string('player_name'); $t->string('role')->default('MEMBER');
            $t->integer('town_hall')->default(0); $t->integer('trophies')->default(0);
            $t->integer('donations')->default(0); $t->integer('donations_received')->default(0);
            $t->timestampsTz(); $t->index(['player_tag','created_at']);
        });
        Schema::create('sync_logs', function(Blueprint $t){
            $t->id(); $t->string('clan_tag'); $t->string('status'); // OK/PARCIAL/ERROR/THROTTLED
            $t->timestampTz('started_at'); $t->timestampTz('finished_at')->nullable();
            $t->json('payload')->nullable(); $t->timestampsTz(); $t->index('clan_tag');
        });
        Schema::create('wars', function(Blueprint $t){
            $t->id(); $t->string('clan_tag'); $t->timestampTz('end_time')->nullable()->unique();
            $t->string('state'); $t->string('result')->nullable(); $t->integer('team_size')->default(15);
            $t->integer('attacks_per_member')->default(1); $t->json('raw_json')->nullable(); $t->timestampsTz();
        });
        Schema::create('war_participations', function(Blueprint $t){
            $t->id(); $t->foreignId('war_id')->constrained('wars')->cascadeOnDelete();
            $t->string('player_tag'); $t->integer('attacks_done')->default(0); $t->integer('attacks_expected')->default(1);
            $t->integer('stars')->default(0); $t->float('destruction')->default(0);
            $t->boolean('incumplio')->default(false); $t->text('justificacion')->nullable();
            $t->timestampTz('justificacion_until')->nullable(); $t->timestampsTz();
            $t->unique(['war_id','player_tag']);
        });
        Schema::create('capital_seasons', function(Blueprint $t){
            $t->id(); $t->timestampTz('start_time')->unique(); $t->timestampTz('end_time')->nullable();
            $t->string('state')->nullable(); $t->integer('total_attacks')->default(0);
            $t->json('raw_json')->nullable(); $t->timestampsTz();
        });
        Schema::create('capital_participations', function(Blueprint $t){
            $t->id(); $t->foreignId('season_id')->constrained('capital_seasons')->cascadeOnDelete();
            $t->string('player_tag'); $t->integer('attacks')->default(0);
            $t->integer('attack_limit')->default(5); $t->integer('capital_resources_looted')->default(0);
            $t->boolean('cumplio')->default(false); $t->timestampsTz();
            $t->unique(['season_id','player_tag']);
        });
        Schema::create('cwl_groups', function(Blueprint $t){
            $t->id(); $t->string('tag')->unique(); $t->string('state')->nullable(); $t->json('raw_json')->nullable(); $t->timestampsTz();
        });
        Schema::create('cwl_wars', function(Blueprint $t){
            $t->id(); $t->foreignId('cwl_group_id')->nullable()->constrained('cwl_groups')->nullOnDelete();
            $t->string('war_tag')->unique(); $t->string('state'); $t->timestampTz('end_time')->nullable(); $t->json('raw_json')->nullable(); $t->timestampsTz();
        });
        Schema::create('rules', function(Blueprint $t){
            $t->id(); $t->string('key')->unique(); $t->string('description'); $t->json('value')->nullable(); $t->boolean('is_active')->default(true); $t->timestampsTz();
        });
        Schema::create('warnings', function(Blueprint $t){
            $t->id(); $t->string('player_tag'); $t->foreignId('rule_id')->nullable()->constrained('rules')->nullOnDelete();
            $t->string('motivo'); $t->string('severidad'); $t->string('origen'); $t->string('estado')->default('ACTIVA');
            $t->text('observacion')->nullable(); $t->timestampTz('vence_en')->nullable();
            $t->timestampTz('resuelta_en')->nullable(); $t->timestampsTz(); $t->index(['player_tag','estado']);
        });
        Schema::create('alerts', function(Blueprint $t){
            $t->id(); $t->string('player_tag')->nullable(); $t->string('tipo'); $t->string('severidad');
            $t->string('mensaje'); $t->boolean('vista')->default(false); $t->timestampsTz(); $t->index('vista');
        });
        Schema::create('player_states', function(Blueprint $t){
            $t->id(); $t->string('player_tag'); $t->string('estado_auto'); $t->string('estado_manual')->nullable();
            $t->text('motivo_manual')->nullable(); $t->timestampTz('manual_until')->nullable(); $t->timestampsTz();
            $t->index('player_tag');
        });
    }
    public function down(): void {
        Schema::dropIfExists('player_states'); Schema::dropIfExists('alerts'); Schema::dropIfExists('warnings');
        Schema::dropIfExists('rules'); Schema::dropIfExists('cwl_wars'); Schema::dropIfExists('cwl_groups');
        Schema::dropIfExists('capital_participations'); Schema::dropIfExists('capital_seasons');
        Schema::dropIfExists('war_participations'); Schema::dropIfExists('wars');
        Schema::dropIfExists('sync_logs'); Schema::dropIfExists('member_snapshots'); Schema::dropIfExists('clan_snapshots');
    }
};
